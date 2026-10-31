const express = require('express')
const crypto = require('node:crypto')
const rateLimit = require('express-rate-limit')
const db = require('./db')

// KSS (Amin #6339/#6341/#6523): «اشتراک فایل محافظت‌شده» — one file sent from one EYVAN app to another.
// - The sender's app filters the file first («تنظیمات اشتراک فایل»: owner's number hidden or replaced, address, photos,
//   description…) and sends only what is left. The server keeps exactly that snapshot (known fields only; it never
//   adds anything), sealed at rest with AES-256-GCM (AZAR_SYNC_KEY, as /sync).
// - The link «eyvan://share?c=<code>» is valid for 1 hour and works ONCE (#6341); the code is 144 random bits and only
//   its SHA-256 is stored. It opens only inside EYVAN (#6523): there is no web page for it.
// - The receiver must be signed in and must not be the sender. Receiving wipes the snapshot at once; an expired one is
//   wiped by the clean-up, which also forgets rows a day after they ended.
// - No tokens here: the receiver's app writes a normal file, which its own sync then charges.

const TTL_MS = 60 * 60 * 1000
const FORGET_AFTER_MS = 24 * 60 * 60 * 1000
const CODE = /^[A-Za-z0-9_-]{22,64}$/
const MAX_PHOTOS = 10
const MAX_PHOTO_CHARS = 1500 * 1000 // one WebP as base64 (~1.1 MB)
const MAX_ACTIVE_PER_ACCOUNT = 30

let now = () => Date.now()
/** tests only: a fixed clock */
function setClock(fn) {
  now = fn || (() => Date.now())
}

function loadKey() {
  const key = Buffer.from(process.env.AZAR_SYNC_KEY || '', 'base64')
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
  CREATE TABLE IF NOT EXISTS share_links (
    code_hash TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    data BLOB,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    receiver_id TEXT
  );
  CREATE INDEX IF NOT EXISTS share_links_sender ON share_links(sender_id, created_at);
  CREATE INDEX IF NOT EXISTS share_links_expires ON share_links(expires_at);
`)

const hashOf = (code) => crypto.createHash('sha256').update(code).digest('hex')

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/** The account behind the session token (body or X-Session-Token header), or null. */
function accountOf(req) {
  const token = (typeof req.body?.sessionToken === 'string' && req.body.sessionToken) || req.get('x-session-token') || ''
  if (!token) return null
  const row = db.prepare('SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND u.deleted_at IS NULL').get(token)
  return row ? row.user_id : null
}

/** Snapshots past their hour lose their contents; rows a day past their end are forgotten. */
function cleanUp() {
  const t = now()
  db.prepare('UPDATE share_links SET data = NULL WHERE data IS NOT NULL AND expires_at <= ?').run(new Date(t).toISOString())
  db.prepare('DELETE FROM share_links WHERE expires_at <= ?').run(new Date(t - FORGET_AFTER_MS).toISOString())
}

const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e15 ? v : null)

/**
 * The sender's snapshot → the same snapshot with only the known fields (anything else is dropped, nothing is added).
 * null when it is not a file (no title) or a field is malformed.
 */
function cleanFile(file) {
  if (!file || typeof file !== 'object' || Array.isArray(file)) return null
  const title = str(file.title, 300)
  if (!title || !title.trim()) return null
  const out = { v: 1, title }
  for (const [k, max] of [
    ['propertyType', 100],
    ['transactionType', 100],
    ['city', 100],
    ['region', 100],
    ['address', 1000],
    ['barterOtherDescription', 2000],
    ['description', 5000]
  ]) {
    if (file[k] === undefined || file[k] === null) continue
    const v = str(file[k], max)
    if (v === null) return null
    out[k] = v
  }
  for (const k of ['price', 'area', 'rooms', 'depositAmount', 'rentAmount']) {
    if (file[k] === undefined || file[k] === null) continue
    const v = num(file[k])
    if (v === null) return null
    out[k] = v
  }
  if (file.isConvertible !== undefined) out.isConvertible = file.isConvertible === true
  if (file.barterItems !== undefined) {
    if (!Array.isArray(file.barterItems) || file.barterItems.length > 10 || !file.barterItems.every((b) => str(b, 50))) return null
    out.barterItems = file.barterItems
  }
  if (file.owner !== undefined && file.owner !== null) {
    const o = file.owner
    const name = str(o?.name, 200)
    const phone = str(o?.phone, 20)
    if (!name || !phone || !/^\+?\d{10,15}$/.test(phone)) return null
    out.owner = { name, phone }
    if (o.notes !== undefined && o.notes !== null) {
      const notes = str(o.notes, 2000)
      if (notes === null) return null
      out.owner.notes = notes
    }
    if (o.isSender === true) out.owner.isSender = true
  }
  if (file.photos !== undefined) {
    if (!Array.isArray(file.photos) || file.photos.length > MAX_PHOTOS) return null
    const photos = []
    for (const p of file.photos) {
      const data = str(p?.data, MAX_PHOTO_CHARS)
      if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) return null
      photos.push({ data, bytes: num(p.bytes) ?? Math.floor((data.length * 3) / 4), width: num(p.width), height: num(p.height) })
    }
    out.photos = photos
  }
  return out
}

const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

const router = express.Router()
router.use(limiter)
router.use(express.json({ limit: '16mb' }))
router.use((_req, res, next) => {
  if (!KEY) return fail(res, 503, 'share_unavailable', 'اشتراک فایل فعلاً در دسترس نیست. کمی بعد دوباره تلاش کنید.')
  next()
})

// POST /share/create { sessionToken, file } → { code, link, expiresAt }
router.post('/create', (req, res) => {
  const sender = accountOf(req)
  if (!sender) return fail(res, 401, 'session_revoked', 'دوباره وارد شوید.')
  const file = cleanFile(req.body?.file)
  if (!file) return fail(res, 422, 'invalid_file', 'اطلاعات این فایل کامل نیست. فایل را باز کنید و دوباره تلاش کنید.')
  cleanUp()
  const t = now()
  const active = db
    .prepare('SELECT COUNT(*) AS n FROM share_links WHERE sender_id = ? AND used_at IS NULL AND expires_at > ?')
    .get(sender, new Date(t).toISOString()).n
  if (active >= MAX_ACTIVE_PER_ACCOUNT) {
    return fail(res, 429, 'too_many_links', 'لینک‌های باز شما زیاد است. کمی بعد دوباره تلاش کنید.')
  }
  const code = crypto.randomBytes(18).toString('base64url')
  const expiresAt = new Date(t + TTL_MS).toISOString()
  db.prepare('INSERT INTO share_links (code_hash, sender_id, data, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    hashOf(code),
    sender,
    seal(Buffer.from(JSON.stringify(file), 'utf8')),
    new Date(t).toISOString(),
    expiresAt
  )
  res.status(201).json({ code, link: `eyvan://share?c=${code}`, expiresAt })
})

// POST /share/receive { sessionToken, code } → { file, sharedAt } — once
router.post('/receive', (req, res) => {
  const receiver = accountOf(req)
  if (!receiver) return fail(res, 401, 'session_revoked', 'دوباره وارد شوید.')
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  const notFound = () => fail(res, 404, 'share_not_found', 'این لینک پیدا نشد. بارکد را دوباره اسکن کنید یا از فرستنده لینک تازه بخواهید.')
  if (!CODE.test(code)) return notFound()
  cleanUp()
  const hash = hashOf(code)
  const row = db.prepare('SELECT * FROM share_links WHERE code_hash = ?').get(hash)
  if (!row) return notFound()
  const at = new Date(now()).toISOString()
  if (row.used_at) return fail(res, 410, 'share_used', 'این لینک یک‌بار استفاده شده و دیگر کار نمی‌کند. از فرستنده لینک تازه بخواهید.')
  if (row.expires_at <= at || !row.data) {
    return fail(res, 410, 'share_expired', 'اعتبار یک‌ساعتهٔ این لینک تمام شده است. از فرستنده لینک تازه بخواهید.')
  }
  if (row.sender_id === receiver) {
    return fail(res, 409, 'share_own', 'این لینک را خودتان ساخته‌اید. آن را برای همکارتان بفرستید تا در ایوانِ خودش باز کند.')
  }
  // used and wiped in one step: of two phones scanning at once, only one gets the file
  const taken = db.transaction(() => {
    const current = db.prepare('SELECT data, used_at FROM share_links WHERE code_hash = ?').get(hash)
    if (!current || current.used_at || !current.data) return null
    db.prepare('UPDATE share_links SET used_at = ?, receiver_id = ?, data = NULL WHERE code_hash = ?').run(at, receiver, hash)
    return current.data
  })()
  if (!taken) return fail(res, 410, 'share_used', 'این لینک یک‌بار استفاده شده و دیگر کار نمی‌کند. از فرستنده لینک تازه بخواهید.')
  res.json({ file: JSON.parse(open(taken).toString('utf8')), sharedAt: row.created_at })
})

module.exports = { router, cleanFile, cleanUp, setClock, TTL_MS }
