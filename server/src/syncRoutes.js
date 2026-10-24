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
// 50 MB = 6,350 tokens (1 KB = 0.127 token, Amin #4164); a push that would go over it is refused.

const QUOTA_BYTES = Number(process.env.AZAR_SYNC_QUOTA_BYTES) || 50 * 1000 * 1000
const TOKENS_PER_KB = 0.127
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
  return session ? session.user_id : null
}

function usageOf(accountId) {
  const rows = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_rows WHERE account_id = ?').get(accountId).b
  const blobs = db.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM sync_blobs WHERE account_id = ?').get(accountId).b
  const bytes = rows + blobs
  return { bytes, quotaBytes: QUOTA_BYTES, tokens: Math.round((bytes / 1000) * TOKENS_PER_KB * 10) / 10 }
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

    const prepared = changes.map((c) => {
      const old = current.get(accountId, c.t, c.k)?.bytes ?? 0
      if (c.row === null) return { c, sealed: null, bytes: 0, delta: -old }
      const plain = Buffer.from(JSON.stringify(c.row), 'utf8')
      return { c, sealed: seal(plain), bytes: plain.length, delta: plain.length - old }
    })
    const delta = prepared.reduce((sum, p) => sum + p.delta, 0)
    try {
      db.transaction(() => {
        if (s) {
          // the size change against what the server holds: a push sent again changes nothing
          tokens.ensureOpening(accountId, s)
          const rows = tokens.pushRows(
            accountId,
            prepared.map((p) => ({ table: p.c.t, delta: p.delta })),
            s,
            crypto.randomUUID()
          )
          for (const r of rows) tokens.post(accountId, r.reason, r.amount, r.idem, null, now)
        } else if (delta > 0 && usageOf(accountId).bytes + delta > QUOTA_BYTES) {
          throw new QuotaError()
        }
        for (const { c, sealed, bytes } of prepared) {
          if (sealed) upsert.run(accountId, c.t, c.k, sealed, bytes, now)
          else remove.run(accountId, c.t, c.k)
        }
      })()
    } catch (error) {
      if (error instanceof tokens.TokensShortError) {
        return fail(res, 422, 'tokens_short', 'The tokens of this account are not enough for this change.')
      }
      if (error instanceof QuotaError) return fail(res, 422, 'storage_full', 'The storage tokens of this account are used up.')
      throw error
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
      const s = await tokens.settings()
      const at = new Date().toISOString()
      try {
        db.transaction(() => {
          if (s) {
            // Amin #5062: a photo costs its exact WebP size
            tokens.ensureOpening(accountId, s)
            const rows = tokens.pushRows(accountId, [{ table: 'photos', delta: data.length }], s, `blob:${hash}:${at}`)
            for (const r of rows) tokens.post(accountId, r.reason, r.amount, r.idem, hash, at)
          } else if (usageOf(accountId).bytes + data.length > QUOTA_BYTES) {
            throw new QuotaError()
          }
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

// POST /sync/blob/delete { sessionToken, hash } → { usage }: a photo no longer used gives its tokens back
router.post('/blob/delete', json, async (req, res, next) => {
  try {
    const accountId = accountOf(req)
    if (!accountId) return fail(res, 401, 'session_revoked', 'Sign in again.')
    const hash = typeof req.body?.hash === 'string' ? req.body.hash : ''
    if (HASH.test(hash)) {
      const s = await tokens.settings()
      const blob = db.prepare('SELECT bytes FROM sync_blobs WHERE account_id = ? AND hash = ?').get(accountId, hash)
      if (blob) {
        const at = new Date().toISOString()
        db.transaction(() => {
          db.prepare('DELETE FROM sync_blobs WHERE account_id = ? AND hash = ?').run(accountId, hash)
          // the photo's tokens come back
          if (s) {
            tokens.ensureOpening(accountId, s)
            tokens.post(accountId, 'photo_refund', tokens.bytesToTokens(blob.bytes, s), `blob-delete:${accountId}:${hash}:${at}`, hash, at)
          }
        })()
      }
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

module.exports = { router, deleteAccountData }
