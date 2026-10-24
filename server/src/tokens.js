const express = require('express')
const crypto = require('node:crypto')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { appPrices } = require('./licenceRoutes')

// KSS (Amin #5052/#5054, GO #5065/#5073): EYVAN's tokens. Tokens are not money. Every account has one ledger:
// balance = allowance + earned + bought − spent, the sum of its rows, never below zero. The numbers come from
// kss-pricing's «اپلیکیشن‌ها» (app.eyvan_*); an empty number turns its part off (no fallback).
// - Files, contracts and photos cost their stored size (tokens per KB). /sync/push and /sync/blob/* post the
//   change in the same transaction as the data: growing spends, deleting or shrinking refunds. The amount is the
//   size change against what the server already holds, so a push the phone sends again changes nothing.
// - A push or photo that would take the balance below zero is refused (tokens_short); the phone keeps it queued.
// - Bonuses (referral: once, when the invited colleague's first file reaches the server; profile: once, when the name,
//   agency and photo are all on the server) only while the daily cap is set and not reached; a bonus that does not fit
//   today is paid on a later push.
// - Opening rows: the first time an account is seen, its allowance and what it already stores (today's card).

const REASONS = [
  'allowance',
  'file_spend',
  'file_refund',
  'contract_spend',
  'contract_refund',
  'photo_spend',
  'photo_refund',
  'phone_change',
  'referral_bonus',
  'profile_bonus',
  'pack_bought'
]
const BONUS_REASONS = ['referral_bonus', 'profile_bonus']
/** a file reaching the server = the colleague is active (owner or applicant file) */
const FILE_TABLES = ['properties', 'applicants', 'owner_files', 'applicant_files']
const PROFILE_KEYS = ['display_name', 'agency_name', 'profile_photo']

db.exec(`
  CREATE TABLE IF NOT EXISTS token_ledger (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    at TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL,
    ref TEXT,
    idem_key TEXT NOT NULL UNIQUE
  );
  CREATE INDEX IF NOT EXISTS idx_token_ledger_account ON token_ledger (account_id, at);
`)

class TokensShortError extends Error {
  constructor(balance, needed) {
    super('Not enough tokens.')
    this.balance = balance
    this.needed = needed
  }
}

const round = (n) => Math.round(n * 1000) / 1000
const insert = db.prepare(
  'INSERT OR IGNORE INTO token_ledger (id, account_id, at, reason, amount, ref, idem_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
)

/** Adds one row unless its key is already there; true when added. */
function post(accountId, reason, amount, idemKey, ref = null, at = new Date().toISOString()) {
  if (!REASONS.includes(reason)) throw new Error(`unknown reason ${reason}`)
  return insert.run(crypto.randomUUID(), accountId, at, reason, round(amount), ref, idemKey).changes === 1
}

function balanceOf(accountId) {
  return round(db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM token_ledger WHERE account_id = ?').get(accountId).b)
}

function bytesToTokens(bytes, settings) {
  return (bytes / 1000) * settings.tokensPerKb
}

/** The token numbers, or null while the ledger cannot run (pricing never reached, or allowance / tokens per KB empty). */
async function settings() {
  const p = await appPrices()
  if (!p || p.tokenAllowance == null || p.tokensPerKb == null) return null
  return p
}

/** Stored bytes of an account (rows + photos), as /sync/usage counts them. */
function storedBytes(accountId) {
  const rows = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_rows WHERE account_id = ?').get(accountId).b
  const blobs = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_blobs WHERE account_id = ?').get(accountId).b
  return rows + blobs
}

/** The first time an account is seen: its allowance, and what it already stores spent (its balance = today's card). */
function ensureOpening(accountId, s) {
  if (db.prepare('SELECT 1 FROM token_ledger WHERE account_id = ? AND idem_key = ?').get(accountId, `allowance:${accountId}`)) return
  // dated at sign-up, so they sit before everything the account did since
  const at = db.prepare('SELECT created_at FROM users WHERE id = ?').get(accountId)?.created_at ?? new Date().toISOString()
  db.transaction(() => {
    post(accountId, 'allowance', s.tokenAllowance, `allowance:${accountId}`, null, at)
    const bytes = storedBytes(accountId)
    if (bytes > 0) post(accountId, 'file_spend', -bytesToTokens(bytes, s), `opening:${accountId}`, 'opening', at)
  })()
}

/** Which kind of record a synced row belongs to (for the history: file / contract / photo). */
function kindOf(table) {
  if (table === 'photos') return 'photo'
  if (table === 'contracts') return 'contract'
  return 'file'
}

/**
 * The ledger rows of one push: per kind, the net size change in tokens (negative = spent). `sized` is
 * [{ table, delta (bytes) }]. Throws TokensShortError when the balance would go below zero and the push grows.
 */
function pushRows(accountId, sized, s, stamp) {
  const net = { file: 0, contract: 0, photo: 0 }
  for (const { table, delta } of sized) net[kindOf(table)] += delta
  const rows = []
  for (const [kind, bytes] of Object.entries(net)) {
    if (bytes === 0) continue
    const amount = -bytesToTokens(bytes, s)
    rows.push({ reason: `${kind}_${bytes > 0 ? 'spend' : 'refund'}`, amount, idem: `push:${accountId}:${stamp}:${kind}` })
  }
  const change = rows.reduce((sum, r) => sum + r.amount, 0)
  const balance = balanceOf(accountId)
  if (change < 0 && balance + change < 0) throw new TokensShortError(balance, -change)
  return rows
}

/** Tehran day start (UTC+03:30) of `now`, as ISO. */
function dayStart(now = Date.now()) {
  const offset = 3.5 * 60 * 60 * 1000
  const local = new Date(now + offset)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - offset).toISOString()
}

function bonusRoom(accountId, s, now = Date.now()) {
  if (s.dailyBonusCap == null) return 0
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS b FROM token_ledger
       WHERE account_id = ? AND at >= ? AND reason IN (${BONUS_REASONS.map(() => '?').join(', ')})`
    )
    .get(accountId, dayStart(now), ...BONUS_REASONS).b
  return Math.max(0, s.dailyBonusCap - today)
}

/** Pays a bonus once (by key) if it is set and fits in today's cap; true when paid. */
function payBonus(accountId, reason, amount, idemKey, ref, s) {
  if (amount == null || amount <= 0) return false
  if (db.prepare('SELECT 1 FROM token_ledger WHERE idem_key = ?').get(idemKey)) return false
  if (bonusRoom(accountId, s) < amount) return false
  ensureOpening(accountId, s)
  return post(accountId, reason, amount, idemKey, ref)
}

/** After a push: the bonuses this account's data may now earn (each paid once; later pushes retry what did not fit). */
async function checkBonuses(accountId) {
  const s = await settings()
  if (!s) return
  // referral: this account is active once one of its files is on the server; its referrer earns, if still an account
  const link = db
    .prepare(
      `SELECT r.referrer_user_id AS referrer FROM referral_relationships r JOIN users u ON u.id = r.referrer_user_id
       WHERE r.referred_user_id = ? AND u.deleted_at IS NULL`
    )
    .get(accountId)
  if (link) {
    const hasFile = db
      .prepare(`SELECT 1 FROM sync_rows WHERE account_id = ? AND tbl IN (${FILE_TABLES.map(() => '?').join(', ')}) LIMIT 1`)
      .get(accountId, ...FILE_TABLES)
    if (hasFile) payBonus(link.referrer, 'referral_bonus', s.referralBonus, `referral:${accountId}`, accountId, s)
  }
  // profile: name, agency and photo all on the server
  const keys = db
    .prepare(`SELECT row_key FROM sync_rows WHERE account_id = ? AND tbl = 'application_settings' AND row_key IN (?, ?, ?)`)
    .all(accountId, ...PROFILE_KEYS)
    .map((r) => r.row_key)
  if (PROFILE_KEYS.every((k) => keys.includes(k))) {
    payBonus(accountId, 'profile_bonus', s.profileBonus, `profile:${accountId}`, null, s)
  }
}

function deleteLedger(accountId) {
  db.prepare('DELETE FROM token_ledger WHERE account_id = ?').run(accountId)
}

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

function accountOf(req) {
  const token = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : ''
  const session = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : null
  return session ? session.user_id : null
}

/** Sums by kind for the «کارنامهٔ توکن» card. */
function summaryOf(accountId) {
  const sums = db
    .prepare('SELECT reason, COALESCE(SUM(amount), 0) AS s FROM token_ledger WHERE account_id = ? GROUP BY reason')
    .all(accountId)
  const by = Object.fromEntries(sums.map((r) => [r.reason, r.s]))
  const sum = (list) => round(list.reduce((t, r) => t + (by[r] ?? 0), 0))
  return {
    balance: balanceOf(accountId),
    allowance: sum(['allowance']),
    earned: sum(BONUS_REASONS),
    bought: sum(['pack_bought']),
    spent: round(-sum(REASONS.filter((r) => !['allowance', 'pack_bought', ...BONUS_REASONS].includes(r))))
  }
}

const router = express.Router()
router.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }))
router.use(express.json({ limit: '16kb' }))

// POST /tokens/ledger { sessionToken, before?: ISO, limit?: n } → { summary, rows: [{ at, reason, amount }], settings }
router.post('/ledger', async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const s = await settings()
    if (!s) return fail(res, 503, 'tokens_unavailable', 'Tokens cannot be read right now.')
    ensureOpening(accountId, s)
    const limit = Math.min(100, Math.max(1, Number(req.body?.limit) || 50))
    const before = typeof req.body?.before === 'string' ? req.body.before : '9999'
    const rows = db
      .prepare('SELECT at, reason, amount FROM token_ledger WHERE account_id = ? AND at < ? ORDER BY at DESC, rowid DESC LIMIT ?')
      .all(accountId, before, limit)
    res.json({
      summary: summaryOf(accountId),
      rows,
      settings: { tokensPerKb: s.tokensPerKb, phoneChangeTokens: s.phoneChangeTokens, packsOn: false }
    })
  } catch (error) {
    next(error)
  }
})

// POST /tokens/buy → token packs wait for the wallet decision (#4899)
router.post('/buy', (_req, res) => fail(res, 403, 'payment_off', 'Token packs are not sold yet.'))

module.exports = {
  router,
  settings,
  ensureOpening,
  pushRows,
  post,
  balanceOf,
  bytesToTokens,
  checkBonuses,
  deleteLedger,
  dayStart,
  TokensShortError
}
