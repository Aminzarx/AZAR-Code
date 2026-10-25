// KSS (Amin #5245): buying tokens in the app. Run: node --test test/purchase.test.js
const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-purchase-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.KSS_PRICING_KEY = 'reader-key'
process.env.AZAR_BILLING_KEY = 'billing-key'
process.env.AZAR_PURCHASE_SECRET = 'shared-secret'
process.env.AZAR_TOKEN_SALES_TEST_NUMBERS = Array.from({ length: 20 }, (_, i) => `0912000${7001 + i}`).join(',')

/** kss-pricing GET /apps: the token price with its VAT answer */
let tokenPrice = { price_toman: 50, vat_applies: true, vat_included: false, vat_rate: 0.1 }
const pricing = http.createServer((req, res) => {
  if (req.url !== '/apps' || req.headers.authorization !== 'Bearer reader-key') return res.writeHead(401).end()
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({
      apps: [
        { key: 'eyvan_token_allowance', value: 100, price_toman: null },
        { key: 'eyvan_tokens_per_kb', value: 0.127, price_toman: null },
        { key: 'eyvan_token_price', value: tokenPrice.price_toman, ...tokenPrice }
      ]
    })
  )
})

/** kssx-billing: makes a payment per order ref; `payments` is what it has verified */
const payments = new Map()
let billingCalls = 0
const billingSrv = http.createServer((req, res) => {
  // the bank's return (no key): billing verifies and says where to go next
  const back = req.url.match(/^\/eyvan-pay\/callback\/([^?]+)\?(.*)$/)
  if (back) {
    const to = back[1] === 'etp_evil01' ? 'https://evil.example/x' : `https://api.zarandix.ir/tokens/paid?paid=ok&order=tko_${back[1]}&q=${encodeURIComponent(back[2])}`
    return res.writeHead(303, { location: to }).end()
  }
  if (req.headers.authorization !== 'Bearer billing-key') return res.writeHead(401).end()
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'POST' && req.url === '/internal/eyvan/token-payments') {
      billingCalls++
      const b = JSON.parse(raw)
      payments.set(b.orderRef, { status: 'started', totalRial: b.totalRial, live: b.live })
      return res.end(JSON.stringify({ paymentId: `pay_${b.orderRef}`, url: `https://sandbox.example/pay/${b.orderRef}` }))
    }
    const m = req.url.match(/^\/internal\/eyvan\/token-payments\/(.+)$/)
    if (req.method === 'GET' && m) {
      const p = payments.get(decodeURIComponent(m[1]))
      if (!p) return res.writeHead(404).end('{}')
      return res.end(JSON.stringify({ status: p.status, refId: p.refId ?? null, verifiedAt: p.verifiedAt ?? null, totalRial: p.totalRial }))
    }
    res.writeHead(404).end('{}')
  })
})

let db, licence, tokens, purchases, server, base

before(async () => {
  await new Promise((r) => pricing.listen(0, '127.0.0.1', r))
  await new Promise((r) => billingSrv.listen(0, '127.0.0.1', r))
  process.env.KSS_PRICING_URL = `http://127.0.0.1:${pricing.address().port}`
  process.env.AZAR_BILLING_URL = `http://127.0.0.1:${billingSrv.address().port}`
  const express = require('express')
  db = require('../src/db')
  const authRoutes = require('../src/authRoutes')
  licence = require('../src/licenceRoutes')
  tokens = require('../src/tokens')
  purchases = require('../src/purchaseRoutes')
  const admin = require('../src/adminRoutes')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/tokens', purchases.router)
  app.use(purchases.bankReturn)
  app.use(express.json())
  app.use('/auth', authRoutes)
  app.use('/tokens', tokens.router)
  app.use('/admin', admin.router)
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
  pricing.close()
  billingSrv.close()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  tokenPrice = { price_toman: 50, vat_applies: true, vat_included: false, vat_rate: 0.1 }
  licence.resetPricesCache()
})

let requests = 0
async function post(route, body, headers = {}) {
  const res = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.2.${++requests >> 8}.${requests & 255}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

let nextPhone = 7000
async function account(spent = 96, listed = true) {
  const phoneNumber = `+98912000${listed ? ++nextPhone : 8000 + (++nextPhone % 1000)}`
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
  const res = await post('/auth/register', { phoneNumber, referralCode: 'AMINZX' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  const a = { ...res.body, phoneNumber }
  await post('/tokens/ledger', { sessionToken: a.sessionToken })
  if (spent) tokens.post(a.userId, 'file_spend', -spent, `test-spend:${a.userId}`)
  return a
}

const sign = (raw) => crypto.createHmac('sha256', 'shared-secret').update(raw).digest('hex')
async function notifyPaid(body, signature) {
  const raw = JSON.stringify(body)
  return post('/tokens/purchase/paid', raw, { 'x-kss-signature': signature ?? sign(raw) })
}
const balance = async (a) => (await post('/tokens/ledger', { sessionToken: a.sessionToken })).body.summary

test('the quote: price × tokens + 10% VAT from pricing; open only for a test number at 95% used', async () => {
  const a = await account()
  const q = (await post('/tokens/purchase/quote', { sessionToken: a.sessionToken, tokens: 200 })).body
  assert.equal(q.open, true)
  assert.equal(q.sandbox, true)
  assert.deepEqual(q.quote, { tokens: 200, unitToman: 50, baseToman: 10000, vatToman: 1000, totalToman: 11000 })

  const notYet = await account(50)
  assert.equal((await post('/tokens/purchase/quote', { sessionToken: notYet.sessionToken })).body.reason, 'not_yet')
  const other = await account(96, false) // not on the test list while sales are not live
  assert.equal((await post('/tokens/purchase/quote', { sessionToken: other.sessionToken })).body.reason, 'sales_off')
})

test('no price or no VAT answer in pricing = off (no fallback); VAT included is taken out of the total', async () => {
  const a = await account()
  tokenPrice = { price_toman: null, vat_applies: null, vat_included: null }
  licence.resetPricesCache()
  assert.equal((await post('/tokens/purchase/quote', { sessionToken: a.sessionToken })).body.reason, 'price_unset')
  tokenPrice = { price_toman: 50, vat_applies: null, vat_included: null }
  licence.resetPricesCache()
  assert.equal((await post('/tokens/purchase/quote', { sessionToken: a.sessionToken })).body.reason, 'vat_unset')
  const r = await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 10 }, { 'idempotency-key': 'k-off' })
  assert.equal(r.status, 409)
  assert.equal(r.body.error.code, 'vat_unset')
  tokenPrice = { price_toman: 55, vat_applies: true, vat_included: true, vat_rate: 0.1 }
  licence.resetPricesCache()
  const q = (await post('/tokens/purchase/quote', { sessionToken: a.sessionToken, tokens: 100 })).body.quote
  assert.deepEqual(q, { tokens: 100, unitToman: 55, baseToman: 5000, vatToman: 500, totalToman: 5500 })
})

test('an order goes to billing once per key; tokens come only after the verified, signed notice, once', async () => {
  const a = await account()
  const before = (await balance(a)).balance
  const calls = billingCalls
  const r1 = await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 200 }, { 'idempotency-key': 'k1' })
  const r2 = await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 200 }, { 'idempotency-key': 'k1' })
  assert.equal(r1.status, 200, JSON.stringify(r1.body))
  assert.equal(r2.body.order.id, r1.body.order.id)
  assert.equal(billingCalls, calls + 1)
  assert.match(r1.body.payUrl, /sandbox\.example/)
  assert.equal(r1.body.order.status, 'pending')
  assert.equal(payments.get(r1.body.order.id).live, false)
  assert.equal((await balance(a)).balance, before) // nothing before the payment is verified

  const orderRef = r1.body.order.id
  assert.equal((await notifyPaid({ orderRef, refId: 'R1', totalRial: 110000 }, 'f'.repeat(64))).status, 401)
  assert.equal((await notifyPaid({ orderRef, refId: 'R1', totalRial: 100 })).status, 409) // amount must match
  const ok = await notifyPaid({ orderRef, refId: 'R1', paidAt: '2026-10-25T14:00:00Z', totalRial: 110000 })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.order.status, 'paid')
  await notifyPaid({ orderRef, refId: 'R1', totalRial: 110000 })
  const after = await balance(a)
  assert.equal(after.balance, before + 200)
  assert.equal(after.bought, 200)

  const receipts = (await post('/tokens/purchases', { sessionToken: a.sessionToken })).body.purchases
  assert.equal(receipts.length, 1)
  assert.deepEqual([receipts[0].refId, receipts[0].paidAt, receipts[0].totalToman, receipts[0].tokens], ['R1', '2026-10-25T14:00:00.000Z', 11000, 200])
})

test('a lost notice is caught up when the app asks for the status (billing says it is paid)', async () => {
  const a = await account()
  const before = (await balance(a)).balance
  const r = await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 10 }, { 'idempotency-key': 'k2' })
  const id = r.body.order.id
  assert.equal((await post('/tokens/purchase/status', { sessionToken: a.sessionToken, orderId: id })).body.order.status, 'pending')
  payments.set(id, { ...payments.get(id), status: 'paid', refId: 'R2', verifiedAt: '2026-10-25T15:00:00Z' })
  const s = await post('/tokens/purchase/status', { sessionToken: a.sessionToken, orderId: id })
  assert.equal(s.body.order.status, 'paid')
  assert.equal(s.body.order.refId, 'R2')
  assert.equal((await balance(a)).balance, before + 10)
  // another account cannot read it
  const b = await account()
  assert.equal((await post('/tokens/purchase/status', { sessionToken: b.sessionToken, orderId: id })).status, 404)
})

test('the order needs a key and a whole token count', async () => {
  const a = await account()
  assert.equal((await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 10 })).body.error.code, 'idempotency_key_required')
  assert.equal((await post('/tokens/purchase', { sessionToken: a.sessionToken, tokens: 1.5 }, { 'idempotency-key': 'k3' })).body.error.code, 'invalid_tokens')
  assert.equal((await post('/tokens/purchase', { sessionToken: 'nope', tokens: 1 }, { 'idempotency-key': 'k4' })).status, 401)
})

test('the page after the gateway says plainly whether it worked, and offers the way back to the app', async () => {
  const ok = await fetch(`${base}/tokens/paid?paid=ok&order=tko_x`)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('cache-control'), 'no-store')
  const okText = await ok.text()
  assert.match(okText, /پرداخت انجام شد/)
  assert.match(okText, /package=com\.azarapp/)
  assert.doesNotMatch(okText, /tko_x/)
  assert.match(await (await fetch(`${base}/tokens/paid?paid=failed`)).text(), /پرداخت انجام نشد/)
})

test('the bank sends the buyer back through our host: billing verifies on loopback, only its «go back» redirect is passed on', async () => {
  const get = (p) => fetch(`${base}${p}`, { redirect: 'manual', headers: { 'x-forwarded-for': `10.9.0.${++requests & 255}` } })
  const ok = await get('/pay/api/v1/eyvan-pay/callback/etp_abc123?Authority=A1&Status=OK')
  assert.equal(ok.status, 303)
  assert.equal(ok.headers.get('location'), 'https://api.zarandix.ir/tokens/paid?paid=ok&order=tko_etp_abc123&q=Authority%3DA1%26Status%3DOK')
  const evil = await get('/pay/api/v1/eyvan-pay/callback/etp_evil01?Status=OK')
  assert.equal(evil.headers.get('location'), '/tokens/paid?paid=failed')
  const bad = await get('/pay/api/v1/eyvan-pay/callback/..%2Fadmin?Status=OK')
  assert.equal(bad.headers.get('location'), '/tokens/paid?paid=failed')
})
