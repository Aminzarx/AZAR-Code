// Amin #5370: KSS announcements to the EYVAN app. KSS writes them in sales management (billing → /admin/announcements);
// the app shows them in «اعلان‌ها» with the reminders until KSS deletes one or the user dismisses it with ×.
// Amin #6214: the home bell counts the ones a person has not seen yet; one may carry a picture, a sound or a video
// (kept here, under the database folder); «push» marks one the phone should also announce; and sales management sees,
// per announcement, how many people saw it (its card was on their screen) and opened it (tapped it or played its media).
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
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
  CREATE TABLE IF NOT EXISTS announcement_reads (
    account_id TEXT NOT NULL,
    announcement_id TEXT NOT NULL,
    seen_at TEXT NOT NULL,
    opened_at TEXT,
    PRIMARY KEY (account_id, announcement_id)
  );
  CREATE TABLE IF NOT EXISTS announcement_media (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    file TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT
  );
`)
// #6214 columns; «tracked» is 1 for announcements made after seen/opened counting began (older ones: unknown, never 0)
const COLUMNS = [
  ['push', 'INTEGER NOT NULL DEFAULT 0'],
  ['media_id', 'TEXT'],
  ['tracked', 'INTEGER NOT NULL DEFAULT 0']
]
const have = new Set(db.prepare('PRAGMA table_info(announcements)').all().map((c) => c.name))
for (const [name, type] of COLUMNS) if (!have.has(name)) db.exec(`ALTER TABLE announcements ADD COLUMN ${name} ${type}`)

const MEDIA_DIR =
  process.env.AZAR_ANNOUNCEMENT_MEDIA_DIR ||
  path.join(path.dirname(process.env.AZAR_DB_PATH || path.join(__dirname, '..', 'data', 'azar-auth.db')), 'announcement-media')
/** the most each kind may weigh */
const MEDIA_LIMITS = { image: 3 * 1024 * 1024, audio: 8 * 1024 * 1024, video: 10 * 1024 * 1024 }

/** what the bytes really are (never the name or the type the sender claims); null = not accepted */
function sniff(buf) {
  const ascii = (from, to) => buf.subarray(from, to).toString('latin1')
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' }
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return { kind: 'image', mime: 'image/png', ext: 'png' }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp', ext: 'webp' }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { kind: 'audio', mime: 'audio/wav', ext: 'wav' }
  if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe6) === 0xe2)) return { kind: 'audio', mime: 'audio/mpeg', ext: 'mp3' }
  if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return { kind: 'audio', mime: 'audio/aac', ext: 'aac' }
  if (ascii(0, 4) === 'OggS') return { kind: 'audio', mime: 'audio/ogg', ext: 'ogg' }
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    return brand.startsWith('M4A') || brand.startsWith('M4B')
      ? { kind: 'audio', mime: 'audio/mp4', ext: 'm4a' }
      : { kind: 'video', mime: 'video/mp4', ext: 'mp4' }
  }
  return null
}

/** a picture/sound/video from the panel, before the announcement that uses it; { error } when not usable */
function storeMedia({ data }, actor) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'base64') : Buffer.alloc(0)
  if (!buf.length) return { error: 'media_empty' }
  const type = sniff(buf)
  if (!type) return { error: 'media_type' }
  if (buf.length > MEDIA_LIMITS[type.kind]) return { error: 'media_too_large', kind: type.kind, limit: MEDIA_LIMITS[type.kind] }
  const id = crypto.randomUUID()
  const file = `${id}.${type.ext}`
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
  fs.writeFileSync(path.join(MEDIA_DIR, file), buf)
  db.prepare('INSERT INTO announcement_media (id, kind, mime, bytes, file, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    type.kind,
    type.mime,
    buf.length,
    file,
    new Date().toISOString(),
    actor
  )
  return { media: { id, kind: type.kind, mime: type.mime, bytes: buf.length } }
}

const mediaOf = (id) => (id ? db.prepare('SELECT * FROM announcement_media WHERE id = ?').get(id) : null)
const mediaShape = (m) => (m ? { id: m.id, kind: m.kind, mime: m.mime, bytes: m.bytes, url: `/announcements/media/${m.id}` } : null)

const shape = (a) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  tone: a.tone,
  createdAt: a.created_at,
  push: a.push === 1,
  media: mediaShape(mediaOf(a.media_id))
})

/** the people an announcement could reach: accounts that exist now (not deleted, not the seed) */
const audienceNow = () =>
  db.prepare("SELECT COUNT(*) AS n FROM users WHERE id != 'bootstrap-seed-user' AND deleted_at IS NULL AND admin_status != 'deleted'").get().n

/** per announcement: seen / opened / closed counts, or null when it is older than the counting (unknown, not zero) */
function statsOf(a, audience) {
  if (a.tracked !== 1) return null
  const r = db
    .prepare('SELECT COUNT(*) AS seen, COUNT(opened_at) AS opened FROM announcement_reads WHERE announcement_id = ?')
    .get(a.id)
  const closed = db.prepare('SELECT COUNT(*) AS n FROM announcement_dismissals WHERE announcement_id = ?').get(a.id).n
  return { audience, seen: r.seen, opened: r.opened, closed }
}

/** what KSS has live, newest first, with each one's counts */
function listLive() {
  const audience = audienceNow()
  return db
    .prepare('SELECT * FROM announcements WHERE deleted_at IS NULL ORDER BY created_at DESC')
    .all()
    .map((a) => ({ ...shape(a), stats: statsOf(a, audience) }))
}

/** a new one from the panel; { error } when the input is not usable */
function create({ title, body, tone, push, mediaId }, actor) {
  const t = typeof title === 'string' ? title.trim() : ''
  const b = typeof body === 'string' ? body.trim() : ''
  if (!t || t.length > 120) return { error: 'title' }
  if (!b || b.length > 2000) return { error: 'body' }
  if (!TONES.includes(tone)) return { error: 'tone' }
  const media = mediaId ? mediaOf(String(mediaId)) : null
  if (mediaId && !media) return { error: 'media' }
  const row = {
    id: crypto.randomUUID(),
    title: t,
    body: b,
    tone,
    created_at: new Date().toISOString(),
    push: push === true ? 1 : 0,
    media_id: media ? media.id : null,
    tracked: 1
  }
  db.prepare(
    'INSERT INTO announcements (id, title, body, tone, created_at, created_by, push, media_id, tracked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(row.id, row.title, row.body, row.tone, row.created_at, actor, row.push, row.media_id, row.tracked)
  return { announcement: { ...shape(row), stats: statsOf(row, audienceNow()) } }
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
  if (session) require('./presence').seen(session.user_id) // Amin #5454: last seen
  return session ? session.user_id : null
}

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const liveIds = (ids) => {
  const list = (Array.isArray(ids) ? ids : []).map((v) => String(v).slice(0, 64)).slice(0, 100)
  if (!list.length) return []
  return db
    .prepare(`SELECT id FROM announcements WHERE deleted_at IS NULL AND id IN (${list.map(() => '?').join(',')})`)
    .all(...list)
    .map((r) => r.id)
}

// the app: POST /announcements { sessionToken } → { announcements } (each with seen: has this account seen it);
// POST /announcements/seen { sessionToken, ids } — these cards were on the screen;
// POST /announcements/:id/open { sessionToken } — tapped, or its media played; POST /announcements/:id/dismiss — ×;
// GET /announcements/media/:id — the picture/sound/video itself (the same for everyone the announcement went to)
const router = express.Router()
router.post('/', (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'authentication_required', 'Sign in first.')
  const rows = db
    .prepare(
      `SELECT a.*, r.seen_at FROM announcements a
       LEFT JOIN announcement_reads r ON r.announcement_id = a.id AND r.account_id = ?
       WHERE a.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM announcement_dismissals d WHERE d.account_id = ? AND d.announcement_id = a.id)
       ORDER BY a.created_at DESC`
    )
    .all(accountId, accountId)
  res.json({ announcements: rows.map((a) => ({ ...shape(a), seen: Boolean(a.seen_at) })) })
})
router.post('/seen', (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'authentication_required', 'Sign in first.')
  const at = new Date().toISOString()
  const insert = db.prepare('INSERT OR IGNORE INTO announcement_reads (account_id, announcement_id, seen_at) VALUES (?, ?, ?)')
  db.transaction((ids) => ids.forEach((id) => insert.run(accountId, id, at)))(liveIds(req.body?.ids))
  res.status(204).end()
})
router.post('/:id/open', (req, res) => {
  const accountId = accountOf(req)
  if (!accountId) return fail(res, 401, 'authentication_required', 'Sign in first.')
  const [id] = liveIds([req.params.id])
  if (!id) return fail(res, 404, 'not_found', 'No such announcement.')
  const at = new Date().toISOString()
  db.prepare(
    `INSERT INTO announcement_reads (account_id, announcement_id, seen_at, opened_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(account_id, announcement_id) DO UPDATE SET opened_at = COALESCE(opened_at, excluded.opened_at)`
  ).run(accountId, id, at, at)
  res.status(204).end()
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
router.get('/media/:id', (req, res) => {
  const m = /^[0-9a-f-]{36}$/.test(req.params.id) ? mediaOf(req.params.id) : null
  // only media an announcement still live uses
  const used = m && db.prepare('SELECT 1 FROM announcements WHERE media_id = ? AND deleted_at IS NULL').get(m.id)
  if (!used) return fail(res, 404, 'not_found', 'Not found.')
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.type(m.mime)
  res.sendFile(path.join(MEDIA_DIR, m.file))
})

module.exports = { router, listLive, create, remove, storeMedia, sniff, MEDIA_LIMITS, TONES }
