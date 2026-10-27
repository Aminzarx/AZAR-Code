// Amin #5454: who is online in EYVAN. users.last_seen_at is the last time the app spoke to the server with a valid
// session — any signed-in call, plus POST /presence, which the app sends every 2 minutes while it is on screen.
// Kept to the minute (one write a minute at most per account); nothing else about the visit is stored.
const express = require('express')
const db = require('./db')

{
  const have = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
  if (!have.includes('last_seen_at')) db.exec('ALTER TABLE users ADD COLUMN last_seen_at TEXT')
}

const bump = db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)')

/** Marks the account as seen now (no write when it was already marked in the last minute). */
function seen(userId) {
  if (!userId) return
  const now = Date.now()
  bump.run(new Date(now).toISOString(), userId, new Date(now - 60 * 1000).toISOString())
}

const router = express.Router()

// POST /presence { sessionToken } → { ok: true }; 401 when the session is gone
router.post('/', express.json({ limit: '4kb' }), (req, res) => {
  const token =
    (typeof req.body?.sessionToken === 'string' && req.body.sessionToken) || req.get('x-session-token') || ''
  const session = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : null
  if (!session) {
    res.status(401).json({ error: { code: 'session_revoked', message: 'Sign in again.' } })
    return
  }
  seen(session.user_id)
  res.json({ ok: true })
})

module.exports = { router, seen }
