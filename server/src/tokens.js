const express = require('express')
const crypto = require('node:crypto')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { appPrices } = require('./licenceRoutes')

// KSS (Amin #5052/#5054, GO #5065/#5073; #5108/#5109): EYVAN's tokens. Tokens are not money. Every account has one
// ledger: balance = allowance + earned + bought − spent, never below zero.
// - The allowance is kss-pricing's «اپلیکیشن‌ها» value as it is now (app.eyvan_token_allowance), not a stored row:
//   changing it there changes every account at once. An empty number turns its part off (no fallback).
// - Tokens are counted only when a property file, an applicant or a contract is saved (Amin #5108) and on a number
//   change. A record costs its stored size with its photos (tokens per KB). /sync/push books, in the same transaction
//   as the data, the change against what that record was already charged: a bigger record spends, a smaller or deleted
//   one gives back, a push sent again changes nothing. Photo uploads, drafts and every other table cost nothing.
// - A save that would take the balance below zero is refused (tokens_short); the phone keeps it queued.
// - Bonuses (referral: once, when the invited colleague's first file reaches the server; profile: once, when the name,
//   agency and photo are all on the server) only while the daily cap is set and not reached; a bonus that does not fit
//   today is paid on a later push.

const REASONS = [
  'admin_grant', // Amin #5197: tokens a KSS admin gave from the billing panel (counted with the gifts)
  'allowance', // only the zero-amount marker of the current model (opening-v2); the allowance itself is not stored
  'file_spend',
  'file_refund',
  'applicant_spend',
  'applicant_refund',
  'contract_spend',
  'contract_refund',
  'photo_spend', // before #5108; removed by the opening rebuild
  'photo_refund',
  'phone_change',
  'referral_bonus',
  'profile_bonus',
  'pack_bought'
]
const BONUS_REASONS = ['referral_bonus', 'profile_bonus']
/** the records that cost tokens, by the table the phone syncs them in */
const RECORD_KINDS = {
  properties: 'file',
  owner_files: 'file',
  applicants: 'applicant',
  applicant_files: 'applicant',
  contracts: 'contract'
}
const RECORD_TABLES = Object.keys(RECORD_KINDS)
const RECORD_REASONS = ['file', 'applicant', 'contract'].flatMap((k) => [`${k}_spend`, `${k}_refund`])
/** photos.subject_type → the record table */
const PHOTO_SUBJECTS = { property: 'properties', contract: 'contracts' }
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
  CREATE INDEX IF NOT EXISTS idx_token_ledger_ref ON token_ledger (account_id, ref);
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

function rowsSum(accountId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM token_ledger WHERE account_id = ?').get(accountId).b
}

/** allowance (as pricing has it now) + every row */
function balanceOf(accountId, s) {
  return round(s.tokenAllowance + rowsSum(accountId))
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

/**
 * What the server holds of an account's records, read through the sync store (rows are sealed there).
 * `rowBytes(table, key)` → bytes or 0; `photos()` → [{ key, subjectTable, subjectId, bytes }].
 */
function recordCost(store, table, key, s, photos) {
  const own = store.rowBytes(table, key)
  if (own === 0) return 0 // deleted (or never stored): its photos go with it
  const photoBytes = photos
    .filter((p) => p.subjectTable === table && p.subjectId === key)
    .reduce((sum, p) => sum + p.bytes, 0)
  return bytesToTokens(own + photoBytes, s)
}

function chargedFor(accountId, ref) {
  return db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS c FROM token_ledger
       WHERE account_id = ? AND ref = ? AND reason IN (${RECORD_REASONS.map(() => '?').join(', ')})`
    )
    .get(accountId, ref, ...RECORD_REASONS).c
}

/**
 * Books the records of one save: each record's cost now against what it was charged so far (negative = spent).
 * `subjects` = [{ table, key }]. Call it inside the transaction, after the rows are stored. Throws TokensShortError
 * when the save grows and the balance would go below zero (the transaction then stores nothing).
 */
function chargeRecords(accountId, subjects, s, store, at = new Date().toISOString()) {
  const seen = new Set()
  const photos = store.photos()
  const rows = []
  for (const { table, key } of subjects) {
    const kind = RECORD_KINDS[table]
    if (!kind || seen.has(`${table}:${key}`)) continue
    seen.add(`${table}:${key}`)
    const ref = `${table}:${key}`
    const diff = round(-recordCost(store, table, key, s, photos) - chargedFor(accountId, ref))
    if (diff === 0) continue
    rows.push({ reason: `${kind}_${diff < 0 ? 'spend' : 'refund'}`, amount: diff, ref })
  }
  const change = rows.reduce((sum, r) => sum + r.amount, 0)
  const balance = balanceOf(accountId, s)
  if (change < 0 && balance + change < 0) throw new TokensShortError(balance, -change)
  for (const r of rows) post(accountId, r.reason, r.amount, `rec:${accountId}:${r.ref}:${crypto.randomUUID()}`, r.ref, at)
  return rows
}

/**
 * The first time an account is seen under this model (#5108): the old per-push and photo rows go, and every record
 * the server already holds is charged at its size now (dated at sign-up). Bonuses, packs and number changes stay.
 */
function ensureOpening(accountId, s, store) {
  if (db.prepare('SELECT 1 FROM token_ledger WHERE idem_key = ?').get(`opening-v2:${accountId}`)) return
  const at = db.prepare('SELECT created_at FROM users WHERE id = ?').get(accountId)?.created_at ?? new Date().toISOString()
  db.transaction(() => {
    db.prepare(
      `DELETE FROM token_ledger WHERE account_id = ? AND reason IN ('allowance', 'photo_spend', 'photo_refund', ${RECORD_REASONS.map(() => '?').join(', ')})`
    ).run(accountId, ...RECORD_REASONS)
    post(accountId, 'allowance', 0, `opening-v2:${accountId}`, null, at)
    if (store) {
      const subjects = db
        .prepare(`SELECT tbl, row_key FROM sync_rows WHERE account_id = ? AND tbl IN (${RECORD_TABLES.map(() => '?').join(', ')})`)
        .all(accountId, ...RECORD_TABLES)
        .map((r) => ({ table: r.tbl, key: r.row_key }))
      // what is already stored is booked even past the allowance (nobody loses data); the balance shows 0 then
      const photos = store.photos()
      for (const { table, key } of subjects) {
        const cost = recordCost(store, table, key, s, photos)
        if (cost > 0) post(accountId, `${RECORD_KINDS[table]}_spend`, -cost, `opening:${accountId}:${table}:${key}`, `${table}:${key}`, at)
      }
    }
  })()
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

/** The card's breakdown (Amin #5103): allowance, gifts, bought, and what each kind uses now. */
function summaryOf(accountId, s) {
  const sums = db
    .prepare('SELECT reason, COALESCE(SUM(amount), 0) AS s FROM token_ledger WHERE account_id = ? GROUP BY reason')
    .all(accountId)
  const by = Object.fromEntries(sums.map((r) => [r.reason, r.s]))
  const sum = (list) => round(list.reduce((t, r) => t + (by[r] ?? 0), 0))
  const used = (kind) => round(-sum([`${kind}_spend`, `${kind}_refund`]))
  const spentBy = {
    files: used('file'),
    applicants: used('applicant'),
    contracts: used('contract'),
    phoneChange: round(-sum(['phone_change']))
  }
  const spent = round(spentBy.files + spentBy.applicants + spentBy.contracts + spentBy.phoneChange)
  const granted = sum(['admin_grant'])
  const earned = round(sum(BONUS_REASONS) + granted)
  const bought = sum(['pack_bought'])
  return {
    balance: Math.max(0, balanceOf(accountId, s)),
    allowance: s.tokenAllowance,
    earned,
    earnedBy: { referral: sum(['referral_bonus']), profile: sum(['profile_bonus']), granted },
    bought,
    spent,
    spentBy
  }
}

/** set by syncRoutes (it holds the key that opens the stored rows) */
let storeFor = null
function useStore(factory) {
  storeFor = factory
}
function storeOf(accountId) {
  return storeFor ? storeFor(accountId) : null
}

const router = express.Router()
router.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }))
router.use(express.json({ limit: '16kb' }))

// POST /tokens/ledger { sessionToken } → { summary, settings }  (the card in Settings; the history page is gone, #5105)
router.post('/ledger', async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const s = await settings()
    if (!s) return fail(res, 503, 'tokens_unavailable', 'Tokens cannot be read right now.')
    ensureOpening(accountId, s, storeOf(accountId))
    res.json({
      summary: summaryOf(accountId, s),
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
  chargeRecords,
  useStore,
  storeOf,
  summaryOf,
  post,
  balanceOf,
  bytesToTokens,
  checkBonuses,
  deleteLedger,
  dayStart,
  RECORD_KINDS,
  PHOTO_SUBJECTS,
  TokensShortError
}
