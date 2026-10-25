const express = require('express')
const crypto = require('node:crypto')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const sms = require('./sms')

// KSS (Amin #4906): EYVAN is a paid app. Every account gets a free trial from its first sign-up (users.created_at),
// as many days as kss-pricing's «اپلیکیشن‌ها» section says (app.eyvan_trial_days); after it, a monthly renewal
// (app.eyvan_monthly) bought in the app. Numbers on the server-side free list (AZAR_LICENCE_FREE_NUMBERS) never expire.
// The answer is signed (Ed25519, AZAR_LICENCE_KEY, outside the repo) so the phone can trust it offline until the end
// date; online, this server is the source of truth. When the licence has ended the app does not lock: the user can
// still open and read their own files; everything else waits for the renewal.

const PRICING_URL = process.env.KSS_PRICING_URL || ''
const PRICING_KEY = process.env.KSS_PRICING_KEY || ''
const DAY = 24 * 60 * 60 * 1000
const PRICES_TTL = 10 * 60 * 1000

function loadKey() {
  const raw = process.env.AZAR_LICENCE_KEY || ''
  if (!raw) return null
  try {
    return crypto.createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' })
  } catch {
    return null
  }
}
const KEY = loadKey()

/** 09xxxxxxxxx of every number on the free list */
const FREE = new Set(
  (process.env.AZAR_LICENCE_FREE_NUMBERS || '')
    .split(',')
    .map((n) => sms.iranMobile(n.trim()))
    .filter(Boolean)
)

db.exec(`
  CREATE TABLE IF NOT EXISTS licences (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    paid_until TEXT,
    updated_at TEXT NOT NULL
  );
`)

// Kssx.ir 2026-10-25 (#5109): the last good answer is also kept on disk, so a restart while kss-pricing cannot be
// reached still has the allowance (never 0, nobody locked out)
db.exec('CREATE TABLE IF NOT EXISTS pricing_cache (id INTEGER PRIMARY KEY CHECK (id = 1), prices TEXT NOT NULL, at TEXT NOT NULL)')
function keptPrices() {
  try {
    const row = db.prepare('SELECT prices FROM pricing_cache WHERE id = 1').get()
    return row ? JSON.parse(row.prices) : null
  } catch {
    return null
  }
}

let prices = null
let pricesAt = 0
/** the app's prices from kss-pricing, kept 10 minutes; the last good answer stays when pricing cannot be reached */
async function appPrices() {
  if (prices && Date.now() - pricesAt < PRICES_TTL) return prices
  if (!prices) prices = keptPrices()
  if (!PRICING_URL || !PRICING_KEY) return prices
  try {
    const res = await fetch(`${PRICING_URL}/apps`, {
      headers: { authorization: `Bearer ${PRICING_KEY}` },
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const byKey = Object.fromEntries((await res.json()).apps.map((a) => [a.key, a]))
      const num = (key) => (typeof byKey[key]?.value === 'number' ? byKey[key].value : null)
      prices = {
        trialDays: byKey.eyvan_trial_days?.value ?? null,
        monthlyToman: byKey.eyvan_monthly?.price_toman ?? null,
        // Amin #5052/#5054 token economy (kss-pricing 0.37.0): an empty input is null = that part is off
        tokenAllowance: num('eyvan_token_allowance'),
        tokensPerKb: num('eyvan_tokens_per_kb'),
        phoneChangeTokens: num('eyvan_phone_change_tokens'),
        referralBonus: num('eyvan_referral_bonus'),
        profileBonus: num('eyvan_profile_bonus'),
        dailyBonusCap: num('eyvan_daily_bonus_cap'),
        tokenPriceToman: byKey.eyvan_token_price?.price_toman ?? null,
        tokenPacks: ['eyvan_token_pack_1', 'eyvan_token_pack_2', 'eyvan_token_pack_3'].map(num).filter((n) => n !== null)
      }
      pricesAt = Date.now()
      db.prepare(
        'INSERT INTO pricing_cache (id, prices, at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET prices = excluded.prices, at = excluded.at'
      ).run(JSON.stringify(prices), new Date(pricesAt).toISOString())
    }
  } catch {
    // keep the last answer
  }
  return prices
}

/** the licence of one account, or null when it cannot be worked out (pricing never reached) */
async function licenceOf(user, now = Date.now()) {
  const p = await appPrices()
  const base = { monthlyToman: p?.monthlyToman ?? null, trialDays: p?.trialDays ?? null }
  // Amin #5197: an account a KSS admin deactivated reads as an ended licence (read-only on the phone)
  if (user.admin_status === 'deactivated') return { state: 'expired', endsAt: user.admin_status_at, ...base }
  if (FREE.has(sms.iranMobile(user.phone_number))) return { state: 'free', endsAt: null, ...base }
  const paid = db.prepare('SELECT paid_until FROM licences WHERE user_id = ?').get(user.id)?.paid_until
  const paidUntil = paid ? Date.parse(paid) : 0
  if (p?.trialDays == null && paidUntil <= now) return null
  const trialEnds = p?.trialDays == null ? 0 : Date.parse(user.created_at) + p.trialDays * DAY
  const endsAt = Math.max(trialEnds, paidUntil)
  const state = endsAt <= now ? 'expired' : paidUntil > now ? 'active' : 'trial'
  return { state, endsAt: new Date(endsAt).toISOString(), ...base }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

/** «payload.signature»: the phone checks it with the public key built into the app */
function sign(userId, licence, now = Date.now()) {
  const payload = b64url(
    JSON.stringify({ u: userId, st: licence.state, e: licence.endsAt ? Date.parse(licence.endsAt) : null, i: now })
  )
  return `${payload}.${b64url(crypto.sign(null, Buffer.from(payload), KEY))}`
}

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

const router = express.Router()
router.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }))

// POST /licence/status { sessionToken } → { licence: { state, endsAt, monthlyToman, trialDays }, signed }
router.post('/status', async (req, res, next) => {
  try {
    if (!KEY) return fail(res, 503, 'licence_unavailable', 'Licences are not configured.')
    const token = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : ''
    const session = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : null
    if (!session) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
    const licence = await licenceOf(user)
    if (!licence) return fail(res, 503, 'licence_unavailable', 'The licence cannot be checked right now.')
    res.json({ licence, signed: sign(user.id, licence) })
  } catch (error) {
    next(error)
  }
})

/** tests: forget the cached prices so the next read asks kss-pricing again; `keepDisk` = as after a restart */
function resetPricesCache({ keepDisk = false } = {}) {
  prices = null
  pricesAt = 0
  if (!keepDisk) db.prepare('DELETE FROM pricing_cache').run()
}

module.exports = { router, licenceOf, appPrices, resetPricesCache }
