const crypto = require('node:crypto')
const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const sms = require('./sms')
const tokens = require('./tokens')
const { appPrices } = require('./licenceRoutes')

// KSS (Amin #5245, plan approved by the brain): buying tokens in the app.
// - Once 95% of the tokens are used, the user types how many tokens they want. The unit price and the VAT answer are
//   kss-pricing's (app.eyvan_token_price, decision.eyvan_token_vat); while either is empty the purchase is off (no
//   fallback). The phone never computes the price: it shows this server's quote.
// - «تأیید و پرداخت» makes an order here (Idempotency-Key: the same key is the same order) and asks kssx-billing for a
//   payment. Billing sends the buyer to the gateway, VERIFIES the payment on its side, and tells this server (signed
//   with AZAR_PURCHASE_SECRET). Only then are the tokens credited, once per order (ledger idem key «order:<id>»).
// - An order is open for 30 minutes. A payment verified later still credits once. The status call also asks billing,
//   so a lost notice is caught up the next time the app looks.
// - Live money is one env line: AZAR_TOKEN_SALES_LIVE=1 (Navid's switch). Until then billing uses the sandbox gateway,
//   and only the numbers in AZAR_TOKEN_SALES_TEST_NUMBERS may buy, so nobody gets tokens from a sandbox payment.

const LIVE = process.env.AZAR_TOKEN_SALES_LIVE === '1'
const BILLING_URL = (process.env.AZAR_BILLING_URL || '').replace(/\/+$/, '')
const BILLING_KEY = process.env.AZAR_BILLING_KEY || ''
const SECRET = process.env.AZAR_PURCHASE_SECRET || ''
const TEST_NUMBERS = new Set(
  (process.env.AZAR_TOKEN_SALES_TEST_NUMBERS || '')
    .split(',')
    .map((n) => sms.iranMobile(n.trim()))
    .filter(Boolean)
)
const OPEN_MINUTES = 30
const MIN_TOKENS = 1
const MAX_TOKENS = 1000000
/** the button turns on once this share of the tokens is used (Amin #5245) */
const BUY_FROM_SHARE = 0.95

db.exec(`
  CREATE TABLE IF NOT EXISTS token_orders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    idem_key TEXT NOT NULL UNIQUE,
    tokens INTEGER NOT NULL,
    unit_toman REAL NOT NULL,
    base_toman INTEGER NOT NULL,
    vat_toman INTEGER NOT NULL,
    total_toman INTEGER NOT NULL,
    live INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    pay_url TEXT,
    ref_id TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_token_orders_account ON token_orders (account_id, created_at);
`)

function fail(res, status, code, message, extra = {}) {
  res.status(status).json({ error: { code, message }, ...extra })
}

function accountOf(req) {
  const token = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : ''
  const session = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : null
  if (session) require('./presence').seen(session.user_id) // Amin #5454: last seen
  return session ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) : null
}

/** «توکن تمام شد» share: what is used of all the account ever had */
function usedShareOf(summary) {
  const total = summary.allowance + summary.earned + summary.bought
  if (total <= 0) return summary.spent > 0 ? 1 : 0
  return Math.min(1, Math.max(0, summary.spent / total))
}

/** The price of `count` tokens as kss-pricing has it now, or why it cannot be sold. */
function priceOf(p, count) {
  if (!p || typeof p.tokenPriceToman !== 'number' || p.tokenPriceToman <= 0) return { off: 'price_unset' }
  const vat = p.tokenVat ?? {}
  if (vat.applies == null) return { off: 'vat_unset' }
  const base = Math.round(count * p.tokenPriceToman)
  let vatToman = 0
  let total = base
  if (vat.applies) {
    if (typeof vat.rate !== 'number' || vat.rate < 0) return { off: 'vat_unset' }
    if (vat.included) vatToman = Math.round(base - base / (1 + vat.rate))
    else {
      vatToman = Math.round(base * vat.rate)
      total = base + vatToman
    }
  }
  return { unitToman: p.tokenPriceToman, baseToman: base - (vat.included ? vatToman : 0), vatToman, totalToman: total }
}

/** May this account buy now? null = yes; otherwise the error code */
function closedFor(user, summary) {
  if (!LIVE && !TEST_NUMBERS.has(sms.iranMobile(user.phone_number))) return 'sales_off'
  if (!BILLING_URL || !BILLING_KEY || !SECRET) return 'sales_off'
  if (usedShareOf(summary) < BUY_FROM_SHARE) return 'not_yet'
  return null
}

function orderView(o) {
  return {
    id: o.id,
    tokens: o.tokens,
    unitToman: o.unit_toman,
    baseToman: o.base_toman,
    vatToman: o.vat_toman,
    totalToman: o.total_toman,
    status: o.status === 'pending' && Date.parse(o.expires_at) <= Date.now() ? 'expired' : o.status,
    refId: o.ref_id,
    paidAt: o.paid_at,
    createdAt: o.created_at,
    sandbox: !o.live
  }
}

/**
 * Credits a verified payment once. `totalRial` must be the order's own total; a second call changes nothing.
 * Returns the order as it is afterwards, or null when the order is unknown or the amount does not match.
 */
function creditOrder(orderId, { refId, paidAt, totalRial }) {
  return db.transaction(() => {
    const o = db.prepare('SELECT * FROM token_orders WHERE id = ?').get(orderId)
    if (!o) return null
    if (o.status === 'paid') return o
    if (Number(totalRial) !== o.total_toman * 10) return null
    const at = paidAt && !Number.isNaN(Date.parse(paidAt)) ? new Date(paidAt).toISOString() : new Date().toISOString()
    tokens.post(o.account_id, 'pack_bought', o.tokens, `order:${o.id}`, refId ? String(refId).slice(0, 80) : null, at)
    db.prepare("UPDATE token_orders SET status = 'paid', ref_id = ?, paid_at = ? WHERE id = ?").run(
      refId ? String(refId).slice(0, 80) : null,
      at,
      o.id
    )
    return db.prepare('SELECT * FROM token_orders WHERE id = ?').get(o.id)
  })()
}

async function billing(method, path, body) {
  const res = await fetch(`${BILLING_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${BILLING_KEY}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000)
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json }
}

/** asks billing about a pending order and credits it if billing verified it (catches a lost notice) */
async function reconcile(o) {
  if (o.status !== 'pending' || !BILLING_URL) return o
  try {
    const r = await billing('GET', `/internal/eyvan/token-payments/${encodeURIComponent(o.id)}`)
    const p = r.json
    if (r.ok && p?.status === 'paid') {
      return creditOrder(o.id, { refId: p.refId, paidAt: p.verifiedAt, totalRial: p.totalRial }) ?? o
    }
  } catch {
    // billing not reachable now: the order stays as it is
  }
  return o
}

function signatureOf(raw) {
  return crypto.createHmac('sha256', SECRET).update(raw).digest('hex')
}

const router = express.Router()
// per route: this router shares /tokens with the ledger router, which has its own limit
const limited = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

// POST /tokens/purchase/quote { sessionToken, tokens? } → { open, reason, unitToman, baseToman, vatToman, totalToman }
router.post('/purchase/quote', limited, express.json({ limit: '4kb' }), async (req, res, next) => {
  try {
    const user = accountOf(req)
    if (!user) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const s = await tokens.settings()
    if (!s) return fail(res, 503, 'tokens_unavailable', 'Tokens cannot be read right now.')
    const price = priceOf(await appPrices(), 1)
    const closed = price.off ?? closedFor(user, tokens.summaryOf(user.id, s))
    const count = Number(req.body?.tokens)
    const quote = !price.off && Number.isInteger(count) && count >= MIN_TOKENS && count <= MAX_TOKENS ? priceOf(await appPrices(), count) : null
    res.json({
      open: closed === null,
      reason: closed,
      unitToman: price.off ? null : price.unitToman,
      minTokens: MIN_TOKENS,
      maxTokens: MAX_TOKENS,
      quote: quote && !quote.off ? { tokens: count, ...quote } : null,
      sandbox: !LIVE
    })
  } catch (error) {
    next(error)
  }
})

// POST /tokens/purchase { sessionToken, tokens }  (Idempotency-Key header) → { order, payUrl }
router.post('/purchase', limited, express.json({ limit: '4kb' }), async (req, res, next) => {
  try {
    const user = accountOf(req)
    if (!user) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const idem = String(req.get('idempotency-key') || '').slice(0, 100)
    if (!idem) return fail(res, 422, 'idempotency_key_required', 'Send an Idempotency-Key.')
    const idemKey = `${user.id}:${idem}`
    const existing = db.prepare('SELECT * FROM token_orders WHERE idem_key = ?').get(idemKey)
    if (existing) {
      if (existing.status === 'pending' && Date.parse(existing.expires_at) > Date.now() && existing.pay_url) {
        return res.json({ order: orderView(existing), payUrl: existing.pay_url })
      }
      return res.json({ order: orderView(await reconcile(existing)), payUrl: null })
    }
    const count = Number(req.body?.tokens)
    if (!Number.isInteger(count) || count < MIN_TOKENS || count > MAX_TOKENS) {
      return fail(res, 422, 'invalid_tokens', `tokens must be a whole number ${MIN_TOKENS}…${MAX_TOKENS}.`)
    }
    const s = await tokens.settings()
    if (!s) return fail(res, 503, 'tokens_unavailable', 'Tokens cannot be read right now.')
    const price = priceOf(await appPrices(), count)
    if (price.off) return fail(res, 409, price.off, 'Token sales are not open.')
    const closed = closedFor(user, tokens.summaryOf(user.id, s))
    if (closed) return fail(res, 409, closed, 'Token sales are not open for this account now.')

    const now = new Date()
    const order = {
      id: `tko_${crypto.randomUUID()}`,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + OPEN_MINUTES * 60 * 1000).toISOString()
    }
    db.prepare(
      `INSERT INTO token_orders (id, account_id, idem_key, tokens, unit_toman, base_toman, vat_toman, total_toman, live, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(order.id, user.id, idemKey, count, price.unitToman, price.baseToman, price.vatToman, price.totalToman, LIVE ? 1 : 0, order.created_at, order.expires_at)

    let r
    try {
      r = await billing('POST', '/internal/eyvan/token-payments', {
        orderRef: order.id,
        accountRef: user.id,
        mobile: sms.iranMobile(user.phone_number),
        tokens: count,
        baseRial: price.baseToman * 10,
        vatRial: price.vatToman * 10,
        totalRial: price.totalToman * 10,
        live: LIVE
      })
    } catch {
      r = { ok: false, status: 502, json: null }
    }
    if (!r.ok || !r.json?.url) {
      db.prepare("UPDATE token_orders SET status = 'failed' WHERE id = ?").run(order.id)
      return fail(res, 502, 'payment_unavailable', 'The payment could not be started; try again later.')
    }
    db.prepare('UPDATE token_orders SET pay_url = ? WHERE id = ?').run(r.json.url, order.id)
    res.json({ order: orderView(db.prepare('SELECT * FROM token_orders WHERE id = ?').get(order.id)), payUrl: r.json.url })
  } catch (error) {
    next(error)
  }
})

// POST /tokens/purchase/status { sessionToken, orderId } → { order }
router.post('/purchase/status', limited, express.json({ limit: '4kb' }), async (req, res, next) => {
  try {
    const user = accountOf(req)
    if (!user) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const o = db.prepare('SELECT * FROM token_orders WHERE id = ? AND account_id = ?').get(String(req.body?.orderId || ''), user.id)
    if (!o) return fail(res, 404, 'not_found', 'No such order.')
    res.json({ order: orderView(await reconcile(o)) })
  } catch (error) {
    next(error)
  }
})

// POST /tokens/purchases { sessionToken } → { purchases: [paid orders, newest first] }  (the receipts)
router.post('/purchases', limited, express.json({ limit: '4kb' }), (req, res) => {
  const user = accountOf(req)
  if (!user) return fail(res, 401, 'session_revoked', 'Sign in again.')
  const rows = db
    .prepare("SELECT * FROM token_orders WHERE account_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 100")
    .all(user.id)
  res.json({ purchases: rows.map(orderView) })
})

// POST /tokens/purchase/paid  (billing → here, after billing verified the payment; body signed with X-KSS-Signature)
router.post('/purchase/paid', limited, express.raw({ type: '*/*', limit: '4kb' }), (req, res) => {
  if (!SECRET) return fail(res, 503, 'not_configured', 'Purchases are not configured.')
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
  const given = String(req.get('x-kss-signature') || '')
  const want = signatureOf(raw)
  if (given.length !== want.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want))) {
    return fail(res, 401, 'bad_signature', 'Signature does not match.')
  }
  let body
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    return fail(res, 400, 'bad_body', 'Body is not JSON.')
  }
  const o = creditOrder(String(body.orderRef || ''), body)
  if (!o) return fail(res, 409, 'order_mismatch', 'Unknown order or amount.')
  res.json({ order: orderView(o) })
})

// GET /tokens/paid?paid=ok|failed&order=… — where billing sends the buyer's browser after the gateway. Only words: the
// tokens were already credited by billing's signed notice, and the app reads the order's status when it is opened again.
router.get('/paid', (req, res) => {
  // Android opens the app itself (eyvan://paid); iPhone and other browsers go back to the web app (#5183)
  const backToApp = /Android/i.test(String(req.get('user-agent') || ''))
    ? 'intent://paid#Intent;scheme=eyvan;package=com.azarapp;end'
    : 'https://app.kssx.ir/'
  const ok = req.query.paid === 'ok'
  res.set({ 'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.send(`<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ok ? 'پرداخت انجام شد' : 'پرداخت انجام نشد'}</title>
<style>
body{margin:0;font-family:Tahoma,sans-serif;background:#f4f6f9;color:#1c2b3a}
.wrap{max-width:420px;margin:0 auto;padding:32px 20px}
.hero{background:${ok ? '#21364f' : '#7a2e2e'};color:#fff;border-radius:20px;padding:28px 22px}
h1{font-size:22px;margin:0 0 8px}p{line-height:1.9;margin:0}
.btn{display:block;text-align:center;text-decoration:none;background:#21364f;color:#fff;font-weight:bold;margin-top:20px;padding:16px;border-radius:12px}
.note{font-size:13px;color:#4a6383;margin-top:14px}
</style></head><body><div class="wrap">
<div class="hero"><h1>${ok ? 'پرداخت انجام شد' : 'پرداخت انجام نشد'}</h1>
<p>${ok ? 'توکن‌ها به حساب شما اضافه شد. به اپ ایوان برگردید؛ رسید خرید آنجاست.' : 'مبلغی از حساب شما کم نشد، یا اگر کم شده باشد بانک آن را برمی‌گرداند. به اپ ایوان برگردید و دوباره امتحان کنید.'}</p></div>
<a class="btn" href="${backToApp}">بازگشت به اپ ایوان</a>
<p class="note">اگر دکمه کار نکرد، این صفحه را ببندید و اپ ایوان را باز کنید.</p>
</div></body></html>`)
})

// GET /pay/api/v1/eyvan-pay/callback/:id — FALLBACK only: since 2026-10-25 the bank returns to kssx.ir/pay/eyvan/… (nginx →
// billing; Amin #5135: no other domain in front of users). Kept for payments started through api.zarandix.ir before that. Passed to billing on loopback, which verifies the payment and answers with where to go
// next (the «go back to the app» page); only that redirect is passed on, never billing's body.
const bankReturn = express.Router()
bankReturn.get('/pay/api/v1/eyvan-pay/callback/:id', limited, async (req, res) => {
  const id = String(req.params.id)
  const query = new URL(req.originalUrl, 'http://x').search
  let to = '/tokens/paid?paid=failed'
  if (/^etp_[A-Za-z0-9_-]{6,60}$/.test(id) && BILLING_URL) {
    try {
      const r = await fetch(`${BILLING_URL}/eyvan-pay/callback/${id}${query}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
      const location = r.headers.get('location')
      if (location && /^https:\/\/(kssx\.ir\/pay\/eyvan\/done|api\.zarandix\.ir\/tokens\/paid)\?/.test(location)) to = location
      else if (location && location.startsWith('/tokens/paid?')) to = location
    } catch {
      // billing unreachable: the buyer is told it did not go through; the order's status is read again from the app
    }
  }
  res.set('cache-control', 'no-store')
  res.redirect(303, to)
})

/** the account's purchases for the admin panel (billing «اپلیکیشن‌ها › ایوان») */
function purchasesOf(accountId) {
  return db
    .prepare("SELECT * FROM token_orders WHERE account_id = ? AND status <> 'failed' ORDER BY created_at DESC LIMIT 200")
    .all(accountId)
    .map(orderView)
}

module.exports = { router, bankReturn, creditOrder, purchasesOf, priceOf, signatureOf }
