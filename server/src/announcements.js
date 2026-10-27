// Amin #5370: KSS announcements to the EYVAN app. KSS writes them in sales management (billing → /admin/announcements);
// the app shows them in «اعلان‌ها» with the reminders until KSS deletes one or the user dismisses it with ×.
const crypto = require('node:crypto')
const express = require('express')
const db = require('./db')

const TONES = ['info', 'success', 'warning', 'danger']

db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tone TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT,
    deleted_at TEXT
  );
  CREATE TABLE IF NOT EXISTS announcement_dismissals (
    account_id TEXT NOT NULL,
    announcement_id TEXT NOT NULL,
    at TEXT NOT NULL,
    PRIMARY KEY (account_id, announcement_id)
  );
`)

const shape = (a) => ({ id: a.id, title: a.title, body: a.body, tone: a.tone, createdAt: a.created_at })

/** what KSS has live, newest first */
function listLive() {
  return db.prepare('SELECT * FROM announcements WHERE deleted_at IS NULL ORDER BY created_at DESC').all().map(shape)
}

/** a new one from the panel; null + reason when the input is not usable */
function create({ title, body, tone }, actor) {
  const t = typeof title === 'string' ? title.trim() : ''
  const b = typeof body === 'string' ? body.trim() : ''
  if (!t || t.length > 120) return { error: 'title' }
  if (!b || b.length > 2000) return { error: 'body' }
  if (!TONES.includes(tone)) return { error: 'tone' }
  const row = { id: crypto.randomUUID(), title: t, body: b, tone, created_at: new Date().toISOString() }
  db.prepare('INSERT INTO announcements (id, title, body, tone, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(
    row.id,
    row.title,
    row.body,
    row.tone,
    row.created_at,
    actor
  )
  return { announcement: shape(row) }
}

/** removed for everyone; false when there was none */
function remove(id) {
  return (
    db
      .prepare('UPDATE announcements SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL')
      .run(new Date().toISOString(), id).changes > 0
  )
}

function accountOf(req) {
  const token = (typeof req.body?.sessionToken === 'string' && req.body.sessionToken) || ''
  const session = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : null
  return session ? session.user_id : null
}

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

// the app: POST /announcements { sessionToken } → { announcements }; POST /announcements/:id/dismiss { sessionToken }
const router = express.Router()
router.post('/', (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'authentication_required', 'Sign in first.')
  const rows = db
    .prepare(
      `SELECT a.* FROM announcements a
       WHERE a.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM announcement_dismissals d WHERE d.account_id = ? AND d.announcement_id = a.id)
       ORDER BY a.created_at DESC`
    )
    .all(accountId)
  res.json({ announcements: rows.map(shape) })
})
router.post('/:id/dismiss', (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'authentication_required', 'Sign in first.')
  db.prepare('INSERT OR IGNORE INTO announcement_dismissals (account_id, announcement_id, at) VALUES (?, ?, ?)').run(
    accountId,
    String(req.params.id).slice(0, 64),
    new Date().toISOString()
  )
  res.status(204).end()
})

module.exports = { router, listLive, create, remove, TONES }
