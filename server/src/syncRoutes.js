const express = require('express')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const tokens = require('./tokens')

// KSS AZAR-SYNC-001 (Amin #4142/#4147/#4192, GO #4797): every file of an account lives here, on the
// number's account. The phone sends each change as soon as it is online (push) and a phone that signs in
// gets everything back (pull). Rows and photos are encrypted at rest with AES-256-GCM (key in
// AZAR_SYNC_KEY, outside the repo). The space an account uses is counted as storage tokens:
// tokens per KB come from kss-pricing (tokens.js; Amin #4302/#5446); without them the 50 MB quota applies.

const QUOTA_BYTES = Number(process.env.AZAR_SYNC_QUOTA_BYTES) || 50 * 1000 * 1000
const BLOB_DIR = process.env.AZAR_SYNC_BLOB_DIR || path.join(path.dirname(db.name), 'blobs')
const MAX_BLOB_BYTES = 3 * 1000 * 1000
const TABLE = /^[a-z_]{1,40}$/
const HASH = /^[a-f0-9]{64}$/

function loadKey() {
  const raw = process.env.AZAR_SYNC_KEY || ''
  const key = Buffer.from(raw, 'base64')
  return key.length === 32 ? key : null
}
const KEY = loadKey()

function seal(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const body = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

function open(sealed) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, sealed.subarray(0, 12))
  decipher.setAuthTag(sealed.subarray(12, 28))
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()])
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_rows (
    account_id TEXT NOT NULL,
    tbl TEXT NOT NULL,
    row_key TEXT NOT NULL,
    data BLOB NOT NULL,
    bytes INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (account_id, tbl, row_key)
  );
  CREATE TABLE IF NOT EXISTS sync_blobs (
    account_id TEXT NOT NULL,
    hash TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (account_id, hash)
  );
`)

/** The stored rows of one account as the token ledger reads them (sizes and photos; rows are sealed at rest). */
function storeOf(accountId) {
  const bytesOf = db.prepare('SELECT bytes FROM sync_rows WHERE account_id = ? AND tbl = ? AND row_key = ?')
  return {
    rowBytes: (table, key) => bytesOf.get(accountId, table, key)?.bytes ?? 0,
    photos: () =>
      db
        .prepare("SELECT row_key, data FROM sync_rows WHERE account_id = ? AND tbl = 'photos'")
        .all(accountId)
        .map((r) => photoSubject(r.row_key, JSON.parse(open(r.data).toString('utf8'))))
        .filter(Boolean)
  }
}

/** A photo row → the record it belongs to and its size (the photo's own bytes, as the phone measured them). */
function photoSubject(key, row) {
  const subjectTable = tokens.PHOTO_SUBJECTS[row?.subject_type]
  if (!subjectTable || typeof row.subject_id !== 'string') return null
  return { key, subjectTable, subjectId: row.subject_id, bytes: Number(row.bytes) || 0 }
}
tokens.useStore(storeOf)

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false })

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/** The account behind the session token (body or X-Session-Token header), or null. */
function accountOf(req) {
  const token =
    (typeof req.body?.sessionToken === 'string' && req.body.sessionToken) || req.get('x-session-token') || ''
  if (!token) return null
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token)
  if (session) require('./presence').seen(session.user_id) // Amin #5454: last seen
  if (!session) return null
  // Amin #5369: «آخرین ورود» = the last time the app was used, kept to the hour
  const now = new Date()
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ? AND (last_login_at IS NULL OR last_login_at < ?)').run(
    now.toISOString(),
    session.user_id,
    new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  )
  return session.user_id
}

function usageOf(accountId) {
  const rows = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_rows WHERE account_id = ?').get(accountId).b
  const blobs = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_blobs WHERE account_id = ?').get(accountId).b
  const bytes = rows + blobs
  return { bytes, quotaBytes: QUOTA_BYTES }
}

function blobPath(accountId, hash) {
  return path.join(BLOB_DIR, accountId, hash + '.bin')
}

class QuotaError extends Error {}

const router = express.Router()
router.use(limiter)
router.use((req, res, next) => {
  if (!KEY) return fail(res, 503, 'sync_unavailable', 'Server storage is not configured.')
  next()
})

const json = express.json({ limit: '2mb' })
const blobJson = express.json({ limit: '5mb' })

// POST /sync/push { sessionToken, changes: [{ t, k, row | null }] } → { usage }
// row = the whole row as the phone has it now; null = the row was deleted. Applied all together or not at all.
router.post('/push', json, async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : null
    if (!changes || changes.length > 500) return fail(res, 422, 'invalid_changes', 'Send 1 to 500 changes.')
    for (const c of changes) {
      if (!c || !TABLE.test(c.t) || typeof c.k !== 'string' || !c.k || c.k.length > 200) {
        return fail(res, 422, 'invalid_changes', 'Each change needs a table and a key.')
      }
      if (c.row !== null && (typeof c.row !== 'object' || Array.isArray(c.row))) {
        return fail(res, 422, 'invalid_changes', 'A row is an object or null.')
      }
    }

    // Amin #5052: the token numbers (null while pricing cannot be reached: then the old 50 MB quota guards the push)
    const s = await tokens.settings()
    const now = new Date().toISOString()
    const current = db.prepare('SELECT bytes FROM sync_rows WHERE account_id = ? AND tbl = ? AND row_key = ?')
    const upsert = db.prepare(`INSERT INTO sync_rows (account_id, tbl, row_key, data, bytes, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, tbl, row_key) DO UPDATE SET data = excluded.data, bytes = excluded.bytes, updated_at = excluded.updated_at`)
    const remove = db.prepare('DELETE FROM sync_rows WHERE account_id = ? AND tbl = ? AND row_key = ?')

    // Amin #5108: the records this save touches (a photo row counts for the record it belongs to, before and after)
    const storedRow = db.prepare('SELECT data FROM sync_rows WHERE account_id = ? AND tbl = ? AND row_key = ?')
    const subjects = []
    for (const c of changes) {
      if (tokens.RECORD_KINDS[c.t]) subjects.push({ table: c.t, key: c.k })
      if (c.t !== 'photos') continue
      const before = storedRow.get(accountId, c.t, c.k)
      for (const row of [c.row, before ? JSON.parse(open(before.data).toString('utf8')) : null]) {
        const p = row ? photoSubject(c.k, row) : null
        if (p) subjects.push({ table: p.subjectTable, key: p.subjectId })
      }
    }

    const prepared = changes.map((c) => {
      const old = current.get(accountId, c.t, c.k)?.bytes ?? 0
      if (c.row === null) return { c, sealed: null, bytes: 0, delta: -old }
      const plain = Buffer.from(JSON.stringify(c.row), 'utf8')
      return { c, sealed: seal(plain), bytes: plain.length, delta: plain.length - old }
    })
    const delta = prepared.reduce((sum, p) => sum + p.delta, 0)
    try {
      db.transaction(() => {
        if (s) tokens.ensureOpening(accountId, s, storeOf(accountId))
        else if (delta > 0 && usageOf(accountId).bytes + delta > QUOTA_BYTES) throw new QuotaError()
        for (const { c, sealed, bytes } of prepared) {
          if (sealed) upsert.run(accountId, c.t, c.k, sealed, bytes, now)
          else remove.run(accountId, c.t, c.k)
        }
        // each touched record against what it was charged: a push sent again changes nothing
        if (s) tokens.chargeRecords(accountId, subjects, s, storeOf(accountId), now)
      })()
    } catch (error) {
      if (error instanceof tokens.TokensShortError) {
        return fail(res, 422, 'tokens_short', 'The tokens of this account are not enough for this change.')
      }
      if (error instanceof QuotaError) return fail(res, 422, 'storage_full', 'The storage tokens of this account are used up.')
      throw error
    }
    // Amin #5295: a deleted contract leaves a line in the audit log (who, which contract, when)
    const auditInsert = db.prepare('INSERT INTO admin_audit (id, at, actor, action, user_id, detail) VALUES (?, ?, ?, ?, ?, ?)')
    for (const { c, delta } of prepared) {
      if (c.t === 'contracts' && c.row === null && delta < 0) {
        auditInsert.run(crypto.randomUUID(), now, 'app', 'contract_delete', accountId, `contract ${c.k}`)
      }
    }
    await tokens.checkBonuses(accountId)
    res.json({ usage: usageOf(accountId) })
  } catch (error) {
    next(error)
  }
})

// POST /sync/pull { sessionToken } → { rows: [{ t, k, row }], blobs: [hash], usage }
router.post('/pull', json, (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
  const rows = db
    .prepare('SELECT tbl, row_key, data FROM sync_rows WHERE account_id = ?')
    .all(accountId)
    .map((r) => ({ t: r.tbl, k: r.row_key, row: JSON.parse(open(r.data).toString('utf8')) }))
  const blobs = db.prepare('SELECT hash FROM sync_blobs WHERE account_id = ?').all(accountId).map((b) => b.hash)
  res.json({ rows, blobs, usage: usageOf(accountId) })
})

// POST /sync/usage { sessionToken } → { usage }
router.post('/usage', json, (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
  res.json({ usage: usageOf(accountId) })
})

// POST /sync/blob/put { sessionToken, data: base64 photo } → { hash, usage }
// Photos are stored once per account under their SHA-256, encrypted, outside the web root.
router.post('/blob/put', blobJson, async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const data = typeof req.body?.data === 'string' ? Buffer.from(req.body.data, 'base64') : null
    if (!data || data.length === 0 || data.length > MAX_BLOB_BYTES) {
      return fail(res, 422, 'invalid_blob', 'Send the photo as base64, up to 3 MB.')
    }
    const hash = crypto.createHash('sha256').update(data).digest('hex')
    if (!db.prepare('SELECT 1 FROM sync_blobs WHERE account_id = ? AND hash = ?').get(accountId, hash)) {
      // Amin #5108: an upload costs nothing; the photo counts with its record when that is saved (/sync/push)
      const s = await tokens.settings()
      const at = new Date().toISOString()
      try {
        db.transaction(() => {
          if (!s && usageOf(accountId).bytes + data.length > QUOTA_BYTES) throw new QuotaError()
          db.prepare('INSERT INTO sync_blobs (account_id, hash, bytes, created_at) VALUES (?, ?, ?, ?)').run(
            accountId, hash, data.length, at
          )
        })()
      } catch (error) {
        if (error instanceof tokens.TokensShortError) {
          return fail(res, 422, 'tokens_short', 'The tokens of this account are not enough for this photo.')
        }
        if (error instanceof QuotaError) return fail(res, 422, 'storage_full', 'The storage tokens of this account are used up.')
        throw error
      }
      fs.mkdirSync(path.dirname(blobPath(accountId, hash)), { recursive: true })
      fs.writeFileSync(blobPath(accountId, hash), seal(data))
    }
    res.json({ hash, usage: usageOf(accountId) })
  } catch (error) {
    next(error)
  }
})

// POST /sync/blob/get { sessionToken, hash } → { data: base64 photo }
router.post('/blob/get', json, (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
  const hash = typeof req.body?.hash === 'string' ? req.body.hash : ''
  if (!HASH.test(hash) || !db.prepare('SELECT 1 FROM sync_blobs WHERE account_id = ? AND hash = ?').get(accountId, hash)) {
    return fail(res, 404, 'not_found', 'No such photo.')
  }
  res.json({ data: open(fs.readFileSync(blobPath(accountId, hash))).toString('base64') })
})

// POST /sync/blob/delete { sessionToken, hash } → { usage }: a photo no longer used (its record gave the tokens back)
router.post('/blob/delete', json, async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const hash = typeof req.body?.hash === 'string' ? req.body.hash : ''
    if (HASH.test(hash)) {
      const blob = db.prepare('SELECT bytes FROM sync_blobs WHERE account_id = ? AND hash = ?').get(accountId, hash)
      if (blob) db.prepare('DELETE FROM sync_blobs WHERE account_id = ? AND hash = ?').run(accountId, hash)
      fs.rmSync(blobPath(accountId, hash), { force: true })
    }
    res.json({ usage: usageOf(accountId) })
  } catch (error) {
    next(error)
  }
})

/** Everything stored for an account (account deletion). */
function deleteAccountData(accountId) {
  db.prepare('DELETE FROM sync_rows WHERE account_id = ?').run(accountId)
  db.prepare('DELETE FROM sync_blobs WHERE account_id = ?').run(accountId)
  tokens.deleteLedger(accountId)
  fs.rmSync(path.join(BLOB_DIR, accountId), { recursive: true, force: true })
}

/** Amin #5197 (admin export / nightly backup): every stored row of an account, opened. */
function rowsOf(accountId) {
  return db
    .prepare('SELECT tbl, row_key, data FROM sync_rows WHERE account_id = ?')
    .all(accountId)
    .map((r) => ({ table: r.tbl, key: r.row_key, row: JSON.parse(open(r.data).toString('utf8')) }))
}

/** one stored photo of an account, opened, or null */
function blobOf(accountId, hash) {
  if (!HASH.test(hash)) return null
  try {
    return open(fs.readFileSync(blobPath(accountId, hash)))
  } catch {
    return null
  }
}

/**
 * Amin #5216: an archived account's files join the new account on the same number. Rows the new account already has
 * (same table + key) stay as they are; the rest move, with user_id/owner_id pointing at the new account. Photos are
 * copied. Returns { moved, kept }.
 */
function moveAccountData(fromId, toId) {
  const have = new Set(
    db.prepare('SELECT tbl, row_key FROM sync_rows WHERE account_id = ?').all(toId).map((r) => `${r.tbl}|${r.row_key}`)
  )
  const insert = db.prepare(
    'INSERT INTO sync_rows (account_id, tbl, row_key, data, bytes, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  let moved = 0
  let kept = 0
  for (const r of db.prepare('SELECT tbl, row_key, data, bytes, updated_at FROM sync_rows WHERE account_id = ?').all(fromId)) {
    if (have.has(`${r.tbl}|${r.row_key}`)) {
      kept += 1
      continue
    }
    const row = JSON.parse(open(r.data).toString('utf8'))
    for (const field of ['user_id', 'owner_id']) if (row && row[field] === fromId) row[field] = toId
    insert.run(toId, r.tbl, r.row_key, seal(Buffer.from(JSON.stringify(row), 'utf8')), r.bytes, r.updated_at)
    moved += 1
  }
  const hasBlob = db.prepare('SELECT 1 FROM sync_blobs WHERE account_id = ? AND hash = ?')
  const insertBlob = db.prepare('INSERT INTO sync_blobs (account_id, hash, bytes, created_at) VALUES (?, ?, ?, ?)')
  for (const b of db.prepare('SELECT hash, bytes, created_at FROM sync_blobs WHERE account_id = ?').all(fromId)) {
    if (hasBlob.get(toId, b.hash)) continue
    const from = blobPath(fromId, b.hash)
    if (!fs.existsSync(from)) continue
    fs.mkdirSync(path.dirname(blobPath(toId, b.hash)), { recursive: true })
    fs.copyFileSync(from, blobPath(toId, b.hash))
    insertBlob.run(toId, b.hash, b.bytes, b.created_at)
  }
  return { moved, kept }
}

/** Amin #6343: a row written into an account's copy by the server (an office's files coming home); the app loads it at its next start */
function putRow(accountId, table, key, row, at = new Date().toISOString()) {
  const plain = Buffer.from(JSON.stringify(row), 'utf8')
  db.prepare(`INSERT INTO sync_rows (account_id, tbl, row_key, data, bytes, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, tbl, row_key) DO UPDATE SET data = excluded.data, bytes = excluded.bytes, updated_at = excluded.updated_at`)
    .run(accountId, table, key, seal(plain), plain.length, at)
}

module.exports = { router, deleteAccountData, rowsOf, blobOf, usageOf, moveAccountData, putRow }
