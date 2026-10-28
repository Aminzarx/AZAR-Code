const crypto = require('node:crypto')
const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateSessionToken } = require('./ids')

// KSS (Amin #5659/#5664/#5909/#5913/#5934): the real-estate office dashboard. An office belongs to one EYVAN
// account (the manager), who signs in on the web with a phone code. Its own session never touches the phone's
// (the app's /auth/login keeps one active phone per account and would sign the phone out).
// The office's files live only here, sealed at rest like the phones' copies; advisers join with a one-time
// 8-digit code plus a 4-letter word and see the files sent to them online only, with the fields the manager allows.

const DAY = 24 * 60 * 60 * 1000
const FILE_DAYS = 30 // a file is «رو به انقضا» in its last 7 days and can be renewed for another 30
const CODE_DAYS = 7
const KINDS = ['فروش', 'رهن و اجاره', 'اجاره', 'تهاتر']
const FIELDS = ['specs', 'description', 'address', 'owner'] // what a share may carry; specs always goes
const DEFAULT_RULES = { description: true, address: false, owner: false }
const WORDS = ['برگ', 'کوه', 'ماهی', 'باغ', 'سیب', 'ابر', 'گل', 'آب', 'نان', 'دریا', 'ماه', 'شمع', 'کتاب', 'سنگ', 'چای', 'برف']
const PHONE = /^(\+989\d{9}|09\d{9})$/

function key() {
  const k = Buffer.from(process.env.AZAR_SYNC_KEY || '', 'base64')
  return k.length === 32 ? k : null
}
function seal(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}
function open(sealed) {
  const d = crypto.createDecipheriv('aes-256-gcm', key(), sealed.subarray(0, 12))
  d.setAuthTag(sealed.subarray(12, 28))
  return JSON.parse(Buffer.concat([d.update(sealed.subarray(28)), d.final()]).toString('utf8'))
}

db.exec(`
  CREATE TABLE IF NOT EXISTS offices (
    id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, rules TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS office_sessions (
    token TEXT PRIMARY KEY, office_id TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS office_files (
    id TEXT PRIMARY KEY, office_id TEXT NOT NULL, data BLOB NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL, archived_at TEXT
  );
  CREATE INDEX IF NOT EXISTS office_files_office ON office_files(office_id, created_at);
  CREATE TABLE IF NOT EXISTS office_codes (
    code TEXT PRIMARY KEY, word TEXT NOT NULL, office_id TEXT NOT NULL, created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL, used_by TEXT, used_at TEXT, revoked_at TEXT
  );
  CREATE TABLE IF NOT EXISTS office_advisers (
    office_id TEXT NOT NULL, user_id TEXT NOT NULL, linked_at TEXT NOT NULL, ended_at TEXT,
    PRIMARY KEY (office_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS office_shares (
    office_id TEXT NOT NULL, file_id TEXT NOT NULL, adviser_id TEXT NOT NULL, fields TEXT NOT NULL, shared_at TEXT NOT NULL,
    PRIMARY KEY (file_id, adviser_id)
  );
`)

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}
const now = () => new Date().toISOString()
const text = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : NaN)

/** The office behind the dashboard's session (X-Office-Token), or null. */
function officeOf(req) {
  const token = req.get('x-office-token') || ''
  if (!token) return null
  const s = db.prepare('SELECT office_id FROM office_sessions WHERE token = ?').get(token)
  return s ? db.prepare('SELECT * FROM offices WHERE id = ?').get(s.office_id) : null
}
/** The EYVAN account behind an app session (for advisers), or null. */
function adviserOf(req) {
  const token = (typeof req.body?.sessionToken === 'string' && req.body.sessionToken) || req.get('x-session-token') || ''
  return token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token)?.user_id ?? null : null
}
function displayName(userId) {
  try {
    const row = require('./syncRoutes')
      .rowsOf(userId)
      .find((r) => r.table === 'application_settings' && r.key === 'display_name')
    const name = row?.row?.value
    if (name) return String(name)
  } catch {
    /* no copy on the server yet */
  }
  const phone = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(userId)?.phone_number
  return phone ? phone.replace(/^\+98/, '0') : 'مشاور'
}

/** A file as the form sends it → the stored shape, or an error message. */
function fileFrom(body) {
  const f = {
    title: text(body.title, 120),
    kind: text(body.kind, 20),
    propertyType: text(body.propertyType, 40),
    city: text(body.city, 60) || 'تهران',
    region: text(body.region, 60),
    address: text(body.address, 300),
    size: num(body.size),
    rooms: num(body.rooms),
    price: num(body.price),
    deposit: num(body.deposit),
    rent: num(body.rent),
    description: text(body.description, 2000),
    ownerName: text(body.ownerName, 80),
    ownerPhone: text(body.ownerPhone, 20)
  }
  if (!f.title) return { error: 'عنوان فایل را بنویسید.' }
  if (!KINDS.includes(f.kind)) return { error: 'نوع معامله را انتخاب کنید.' }
  if (!f.region) return { error: 'منطقه را بنویسید.' }
  for (const k of ['size', 'rooms', 'price', 'deposit', 'rent']) if (Number.isNaN(f[k]) || f[k] < 0) return { error: 'عدد درست وارد کنید.' }
  if (f.ownerPhone && !PHONE.test(f.ownerPhone)) return { error: 'شمارهٔ مالک درست نیست.' }
  return { file: f }
}

function filesOf(officeId) {
  const sent = db.prepare('SELECT file_id, adviser_id FROM office_shares WHERE office_id = ?').all(officeId)
  return db
    .prepare('SELECT * FROM office_files WHERE office_id = ? AND archived_at IS NULL ORDER BY created_at DESC')
    .all(officeId)
    .map((r) => ({
      id: r.id,
      ...open(r.data),
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      sentTo: sent.filter((s) => s.file_id === r.id).map((s) => s.adviser_id)
    }))
}

function advisersOf(officeId) {
  return db
    .prepare('SELECT user_id, linked_at FROM office_advisers WHERE office_id = ? AND ended_at IS NULL ORDER BY linked_at')
    .all(officeId)
    .map((a) => ({ id: a.user_id, name: displayName(a.user_id), linkedAt: a.linked_at }))
}

/** Tehran's calendar day (UTC+3:30) of an ISO time, as YYYY-MM-DD */
function tehranDay(iso) {
  return new Date(Date.parse(iso) + 3.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Each linked adviser's work today, counted from the copy their phone keeps on the server (counts only). */
function activityOf(officeId) {
  const today = tehranDay(now())
  const sync = require('./syncRoutes')
  const presence = db.prepare('SELECT last_login_at FROM users WHERE id = ?')
  return advisersOf(officeId).map((a) => {
    const rows = sync.rowsOf(a.id)
    const madeToday = (table) =>
      rows.filter((r) => r.table === table && r.row?.created_at && tehranDay(r.row.created_at) === today).length
    const touchedToday = (table) =>
      rows.filter((r) => r.table === table && r.row?.updated_at && tehranDay(r.row.updated_at) === today).length
    const deals = rows.filter((r) => r.table === 'deals' && r.row)
    return {
      id: a.id,
      name: a.name,
      newFiles: madeToday('properties'),
      contacts: touchedToday('applicants') + touchedToday('contacts'),
      reminders: madeToday('reminders'),
      closedToday: deals.filter((d) => d.row.status === 'completed' && tehranDay(d.row.updated_at || '1970-01-01') === today).length,
      openDeals: deals.filter((d) => !['completed', 'cancelled'].includes(d.row.status)).map((d) => d.row.status),
      lastSeen: presence.get(a.id)?.last_login_at ?? null
    }
  })
}

function overviewOf(office) {
  const files = filesOf(office.id)
  const today = tehranDay(now())
  const days = Array.from({ length: 14 }, (_, i) => tehranDay(new Date(Date.now() - (13 - i) * DAY).toISOString()))
  const activity = activityOf(office.id)
  const stages = ['new', 'contacted', 'viewing', 'negotiating']
  const open = activity.flatMap((a) => a.openDeals)
  const soon = Date.now() + 7 * DAY
  return {
    office: { name: office.name, rules: { ...DEFAULT_RULES, ...JSON.parse(office.rules || '{}') } },
    asOf: now(),
    files,
    newToday: files.filter((f) => tehranDay(f.createdAt) === today).length,
    newWeek: files.filter((f) => Date.parse(f.createdAt) > Date.now() - 7 * DAY).length,
    perDay: days.map((d) => ({
      day: d,
      office: files.filter((f) => tehranDay(f.createdAt) === d).length,
      advisers: 0
    })),
    expiring: files.filter((f) => Date.parse(f.expiresAt) <= soon).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)),
    sentFiles: files.filter((f) => f.sentTo.length > 0).length,
    advisers: activity.map(({ openDeals, ...a }) => ({ ...a, openDeals: openDeals.length })),
    stages: stages.map((s) => ({ stage: s, count: open.filter((x) => x === s).length })),
    openDeals: open.length,
    codes: db
      .prepare('SELECT code, word, expires_at FROM office_codes WHERE office_id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?')
      .all(office.id, now())
  }
}

const router = express.Router()
router.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }))
router.use((req, res, next) => (key() ? next() : fail(res, 503, 'office_unavailable', 'Server storage is not configured.')))

// POST /office/login { phoneNumber, officeName? } after /auth/send-otp + /auth/verify-otp → { token, office }
// The first sign-in of an account opens its office (it needs the office's name).
router.post('/login', (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const otp = db.prepare('SELECT verified FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otp?.verified) return fail(res, 401, 'authentication_required', 'کد تأیید را دوباره بگیرید.')
  const user = db.prepare('SELECT id, admin_status FROM users WHERE phone_number = ?').get(phoneNumber)
  if (!user) return fail(res, 422, 'no_account', 'این شماره حساب ایوان ندارد؛ اول برنامه را نصب و ثبت‌نام کنید.')
  if (user.admin_status === 'locked' || user.admin_status === 'deleted') return fail(res, 403, 'account_locked', 'این حساب بسته است.')
  let office = db.prepare('SELECT * FROM offices WHERE owner_user_id = ?').get(user.id)
  if (!office) {
    const name = text(req.body.officeName, 80)
    if (!name) return fail(res, 404, 'no_office', 'نام دفتر را بنویسید.')
    office = { id: generateId(), owner_user_id: user.id, name, rules: null, created_at: now() }
    db.prepare('INSERT INTO offices (id, owner_user_id, name, rules, created_at) VALUES (?, ?, ?, ?, ?)').run(
      office.id, office.owner_user_id, office.name, office.rules, office.created_at
    )
  }
  const token = generateSessionToken()
  db.prepare('INSERT INTO office_sessions (token, office_id, created_at) VALUES (?, ?, ?)').run(token, office.id, now())
  db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  res.json({ token, office: { name: office.name } })
})

// Everything below needs the dashboard's session
const manager = express.Router()
manager.use((req, res, next) => {
  const office = officeOf(req)
  if (!office) return fail(res, 401, 'session_revoked', 'دوباره وارد شوید.')
  req.office = office
  next()
})

manager.post('/logout', (req, res) => {
  db.prepare('DELETE FROM office_sessions WHERE token = ?').run(req.get('x-office-token'))
  res.status(204).end()
})

manager.get('/overview', (req, res) => res.json(overviewOf(req.office)))

manager.post('/files', (req, res) => {
  const { file, error } = fileFrom(req.body || {})
  if (error) return fail(res, 422, 'invalid_file', error)
  const id = generateId()
  const at = now()
  db.prepare('INSERT INTO office_files (id, office_id, data, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.office.id, seal(file), at, at, new Date(Date.now() + FILE_DAYS * DAY).toISOString()
  )
  res.status(201).json({ id })
})

const fileRow = (req) => db.prepare('SELECT * FROM office_files WHERE id = ? AND office_id = ? AND archived_at IS NULL').get(req.params.id, req.office.id)

manager.post('/files/:id/renew', (req, res) => {
  if (!fileRow(req)) return fail(res, 404, 'not_found', 'فایل پیدا نشد.')
  db.prepare('UPDATE office_files SET expires_at = ?, updated_at = ? WHERE id = ?').run(new Date(Date.now() + FILE_DAYS * DAY).toISOString(), now(), req.params.id)
  res.status(204).end()
})

manager.post('/files/:id/archive', (req, res) => {
  if (!fileRow(req)) return fail(res, 404, 'not_found', 'فایل پیدا نشد.')
  db.transaction(() => {
    db.prepare('UPDATE office_files SET archived_at = ? WHERE id = ?').run(now(), req.params.id)
    db.prepare('DELETE FROM office_shares WHERE file_id = ?').run(req.params.id) // advisers stop seeing it at once
  })()
  res.status(204).end()
})

// POST /office/share { fileIds, to: 'all' | [adviserId], fields: { description, address, owner } }
manager.post('/share', (req, res) => {
  const ids = Array.isArray(req.body?.fileIds) ? req.body.fileIds.filter((x) => typeof x === 'string') : []
  const linked = new Set(advisersOf(req.office.id).map((a) => a.id))
  const to = req.body?.to === 'all' ? ['*'] : Array.isArray(req.body?.to) ? req.body.to.filter((x) => linked.has(x)) : []
  if (ids.length === 0 || to.length === 0) return fail(res, 422, 'nothing_to_send', 'فایل و مشاور را انتخاب کنید.')
  const mine = new Set(filesOf(req.office.id).map((f) => f.id))
  if (!ids.every((id) => mine.has(id))) return fail(res, 404, 'not_found', 'فایل پیدا نشد.')
  const fields = ['specs', ...FIELDS.slice(1).filter((k) => req.body?.fields?.[k] === true)]
  const put = db.prepare('INSERT OR REPLACE INTO office_shares (office_id, file_id, adviser_id, fields, shared_at) VALUES (?, ?, ?, ?, ?)')
  db.transaction(() => ids.forEach((id) => to.forEach((a) => put.run(req.office.id, id, a, JSON.stringify(fields), now()))))()
  res.json({ sent: ids.length * to.length })
})

manager.put('/rules', (req, res) => {
  const rules = Object.fromEntries(FIELDS.slice(1).map((k) => [k, req.body?.[k] === true]))
  db.prepare('UPDATE offices SET rules = ? WHERE id = ?').run(JSON.stringify(rules), req.office.id)
  res.json({ rules })
})

// POST /office/codes → { code, word, expiresAt }: one-time, for one adviser, 7 days
manager.post('/codes', (req, res) => {
  let code
  do code = String(crypto.randomInt(10000000, 100000000))
  while (db.prepare('SELECT 1 FROM office_codes WHERE code = ?').get(code))
  const word = WORDS[crypto.randomInt(WORDS.length)]
  const expiresAt = new Date(Date.now() + CODE_DAYS * DAY).toISOString()
  db.prepare('INSERT INTO office_codes (code, word, office_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(code, word, req.office.id, now(), expiresAt)
  res.status(201).json({ code, word, expiresAt })
})

manager.post('/codes/:code/revoke', (req, res) => {
  db.prepare('UPDATE office_codes SET revoked_at = ? WHERE code = ? AND office_id = ? AND used_at IS NULL').run(now(), req.params.code, req.office.id)
  res.status(204).end()
})

manager.post('/advisers/:id/unlink', (req, res) => {
  db.transaction(() => {
    db.prepare('UPDATE office_advisers SET ended_at = ? WHERE office_id = ? AND user_id = ? AND ended_at IS NULL').run(now(), req.office.id, req.params.id)
    db.prepare('DELETE FROM office_shares WHERE office_id = ? AND adviser_id = ?').run(req.office.id, req.params.id)
  })()
  res.status(204).end()
})

// The adviser's side (the app, with its own session): join, see what was sent, leave
const adviser = express.Router()
adviser.use((req, res, next) => {
  const userId = adviserOf(req)
  if (!userId) return fail(res, 401, 'session_revoked', 'Sign in again.')
  req.adviserId = userId
  next()
})

// POST /office/adviser/join { sessionToken, code, word } → { office }
adviser.post('/join', (req, res) => {
  const code = text(req.body?.code, 8)
  const word = text(req.body?.word, 10)
  const row = db.prepare('SELECT * FROM office_codes WHERE code = ?').get(code)
  if (!row || row.word !== word || row.used_at || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) {
    return fail(res, 422, 'invalid_code', 'کد یا کلمه درست نیست یا باطل شده است.')
  }
  const office = db.prepare('SELECT * FROM offices WHERE id = ?').get(row.office_id)
  if (office.owner_user_id === req.adviserId) return fail(res, 422, 'own_office', 'این کد دفتر خود شماست.')
  db.transaction(() => {
    // one office per adviser: joining another one leaves the previous office
    for (const old of db.prepare('SELECT office_id FROM office_advisers WHERE user_id = ? AND ended_at IS NULL').all(req.adviserId)) {
      db.prepare('UPDATE office_advisers SET ended_at = ? WHERE office_id = ? AND user_id = ?').run(now(), old.office_id, req.adviserId)
      db.prepare('DELETE FROM office_shares WHERE office_id = ? AND adviser_id = ?').run(old.office_id, req.adviserId)
    }
    db.prepare('INSERT OR REPLACE INTO office_advisers (office_id, user_id, linked_at, ended_at) VALUES (?, ?, ?, NULL)').run(office.id, req.adviserId, now())
    db.prepare('UPDATE office_codes SET used_by = ?, used_at = ? WHERE code = ?').run(req.adviserId, now(), code)
  })()
  res.json({ office: { name: office.name } })
})

// POST /office/adviser/files { sessionToken } → { office, files }: only what was sent, only the allowed fields
adviser.post('/files', (req, res) => {
  const link = db.prepare('SELECT office_id FROM office_advisers WHERE user_id = ? AND ended_at IS NULL').get(req.adviserId)
  if (!link) return res.json({ office: null, files: [] })
  const office = db.prepare('SELECT name FROM offices WHERE id = ?').get(link.office_id)
  const shares = db
    .prepare("SELECT file_id, fields FROM office_shares WHERE office_id = ? AND adviser_id IN (?, '*')")
    .all(link.office_id, req.adviserId)
  const allowed = new Map()
  for (const s of shares) allowed.set(s.file_id, new Set([...(allowed.get(s.file_id) || []), ...JSON.parse(s.fields)]))
  const files = filesOf(link.office_id)
    .filter((f) => allowed.has(f.id))
    .map((f) => {
      const on = allowed.get(f.id)
      return {
        id: f.id, title: f.title, kind: f.kind, propertyType: f.propertyType, city: f.city, region: f.region,
        size: f.size, rooms: f.rooms, price: f.price, deposit: f.deposit, rent: f.rent,
        description: on.has('description') ? f.description : null,
        address: on.has('address') ? f.address : null,
        ownerName: on.has('owner') ? f.ownerName : null,
        ownerPhone: on.has('owner') ? f.ownerPhone : null
      }
    })
  res.json({ office: { name: office.name }, files })
})

adviser.post('/leave', (req, res) => {
  const link = db.prepare('SELECT office_id FROM office_advisers WHERE user_id = ? AND ended_at IS NULL').get(req.adviserId)
  if (link) {
    db.prepare('UPDATE office_advisers SET ended_at = ? WHERE office_id = ? AND user_id = ?').run(now(), link.office_id, req.adviserId)
    db.prepare('DELETE FROM office_shares WHERE office_id = ? AND adviser_id = ?').run(link.office_id, req.adviserId)
  }
  res.status(204).end()
})

router.use('/adviser', adviser)
router.use(manager)

module.exports = { router }
