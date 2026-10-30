const crypto = require('node:crypto')
const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateSessionToken } = require('./ids')
const tokens = require('./tokens')
const purchases = require('./purchaseRoutes')
const { appPrices } = require('./licenceRoutes')

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

function fail(res, status, code, message, extra = {}) {
  res.status(status).json({ error: { code, message }, ...extra })
}

// ---------------------------------------------------------------- the office's tokens (Amin #6269) ----
// The office dashboard has its own token ledger (account «office:<id>» in token_ledger), apart from its manager's app
// tokens and with no free allowance: balance = bought − spent. A file costs what the app charges for a record of its
// size (pricing's tokens per KB, rounded up to whole tokens). Adding a file takes its tokens once (holding cost, #6274 a);
// sending it takes its tokens once per new recipient (123 × 4 advisers = 492); the advisers' own tokens are never
// touched. Not enough tokens = the add or the send is refused with the shortfall and the buy link (#6274 b).
const officeAccount = (officeId) => `office:${officeId}`
const roundT = (n) => Math.round(n * 1000) / 1000
function officeBalance(officeId) {
  return roundT(db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM token_ledger WHERE account_id = ?').get(officeAccount(officeId)).b)
}
// Amin #6289: every office dashboard starts with 2,500 tokens: one ledger line per office, ever (the idem key), given when
// the office is made; an office made before this gets it once at start-up (giveMissingDefaults)
const OFFICE_DEFAULT_TOKENS = 2500
function giveDefault(officeId) {
  return tokens.post(officeAccount(officeId), 'office_default', OFFICE_DEFAULT_TOKENS, `office-default:${officeId}`)
}
/** offices that never got the default → [{ officeId, name, balance }] (dry = only list them) */
function giveMissingDefaults(dry = false) {
  const missing = db.prepare(`SELECT id, name FROM offices o WHERE NOT EXISTS
    (SELECT 1 FROM token_ledger t WHERE t.idem_key = 'office-default:' || o.id)`).all()
  const out = missing.map((o) => ({ officeId: o.id, name: o.name, balance: officeBalance(o.id), gets: OFFICE_DEFAULT_TOKENS }))
  if (!dry) db.transaction(() => missing.forEach((o) => giveDefault(o.id)))()
  return out
}
/** a file's tokens at today's price, or null while pricing cannot be read (then nothing is added or sent) */
function fileTokens(file, s) {
  if (!s) return null
  return Math.max(1, Math.ceil(tokens.bytesToTokens(Buffer.byteLength(JSON.stringify(file), 'utf8'), s)))
}
function tokensShort(res, balance, needed) {
  const fa = (n) => Math.ceil(n).toLocaleString('fa-IR')
  return fail(res, 402, 'tokens_short', `توکن دفتر کافی نیست: ${fa(needed)} توکن لازم است و ${fa(Math.max(0, balance))} توکن دارید. از «توکن‌های دفتر» توکن بخرید.`,
    { balance, needed, buy: '#tokens' })
}
const now = () => new Date().toISOString()
const text = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const toLatin = (v) => v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
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


// ---------------------------------------------------------------- requests (Amin #5970) ----
// The office panel is granted, not open: the user asks in the app (Settings › «اتصال‌ها و API‌ها»: office address,
// union licence, landline) and sales management approves. Approving opens the office for that same account and copies
// the account's files into it; their phone's copy on the server stays untouched, so nothing is lost and turning the
// panel off gives the app back with everything. While the panel is on, the app shows the panel's address instead of
// working. A cancelled request can never be approved.
db.exec(`
  CREATE TABLE IF NOT EXISTS office_requests (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, address TEXT NOT NULL, union_licence INTEGER NOT NULL DEFAULT 0,
    landline TEXT, status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    created_at TEXT NOT NULL, decided_at TEXT, decided_by TEXT
  );
  CREATE INDEX IF NOT EXISTS office_requests_user ON office_requests(user_id, created_at);
`)
const USERNAME = /^[a-z0-9_.]{4,32}$/
const PASSWORD_MIN = 8
/**
 * Amin #6090/#6091: one username in the whole system. The stored form is the compared form: Unicode NFKC, Persian and
 * Arabic digits as Latin, no spaces or invisible marks, lower case («Zarandix» = «zarandix» = «zarandix ‌»).
 */
const usernameOf = (v) =>
  String(v ?? '').normalize('NFKC').slice(0, 80)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').toLowerCase()
const LIVE_REQUEST = "(status = 'pending' OR (status = 'approved' AND ended_at IS NULL))"
/** held by a pending or approved (not turned off) request — any account, the asker's own old one included */
const usernameTaken = (username) => !!db.prepare(`SELECT 1 FROM office_requests WHERE username = ? AND ${LIVE_REQUEST}`).get(username)
/**
 * The rest of the system's names (kssx.ir customer logins, sales-management users, IRIS) live in billing, which also
 * asks IRIS; it answers { taken }. If it can't answer, the request is refused (fail closed), never accepted unchecked.
 */
async function usernameTakenElsewhere(username) {
  const url = (process.env.AZAR_BILLING_URL || '').replace(/\/+$/, ''), key = process.env.AZAR_BILLING_KEY || ''
  if (!url || !key) return process.env.NODE_ENV === 'production' ? null : false
  try {
    const r = await fetch(`${url}/internal/username-taken`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(10000)
    })
    const taken = (await r.json().catch(() => null))?.taken
    return r.ok && typeof taken === 'boolean' ? taken : null
  } catch {
    return null
  }
}
const SCRYPT = { N: 16384, r: 8, p: 1 }
function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  return 's1$' + salt.toString('base64') + '$' + crypto.scryptSync(password, salt, 64, SCRYPT).toString('base64')
}
function passwordMatches(password, stored) {
  const [v, salt, hash] = String(stored || 's1$AAAAAAAAAAAAAAAAAAAAAA==$').split('$')
  const want = Buffer.from(hash || '', 'base64')
  const got = crypto.scryptSync(password, Buffer.from(salt || '', 'base64'), 64, SCRYPT)
  return v === 's1' && want.length === got.length && crypto.timingSafeEqual(want, got)
}
// Amin #6034: the dashboard's own username + password ride on the request
for (const col of ['username TEXT', 'password_hash TEXT', 'ended_at TEXT', 'ended_by TEXT']) {
  if (!db.prepare('PRAGMA table_info(office_requests)').all().some((c) => c.name === col.split(' ')[0])) db.exec(`ALTER TABLE office_requests ADD COLUMN ${col}`)
}
// the database keeps it too: one live request per (normalised) username, whatever the app sends
for (const r of db.prepare('SELECT id, username FROM office_requests WHERE username IS NOT NULL').all()) {
  if (usernameOf(r.username) !== r.username) db.prepare('UPDATE office_requests SET username = ? WHERE id = ?').run(usernameOf(r.username), r.id)
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS office_requests_live_username ON office_requests(username) WHERE username IS NOT NULL AND ${LIVE_REQUEST}`)
const NOT_APPROVED = 'پنل دفتر املاک برای این حساب فعال نیست؛ از برنامهٔ ایوان، تنظیمات › اتصال‌ها و API‌ها، درخواست بدهید.'
const LANDLINE = /^0\d{10}$/
const lastRequest = (userId) => db.prepare('SELECT * FROM office_requests WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(userId)
const requestView = (r) =>
  r ? { id: r.id, status: r.status, address: r.address, unionLicence: !!r.union_licence, landline: r.landline, username: r.username ?? null, createdAt: r.created_at, decidedAt: r.decided_at, endedAt: r.ended_at ?? null } : null
/** true when the account's office panel is on (its app is then off); sales management can turn it off again */
const portalOn = (userId) => {
  const r = lastRequest(userId)
  return r?.status === 'approved' && !r.ended_at
}

const KIND_OF = { sale: 'فروش', rent: 'رهن و اجاره', barter: 'تهاتر' }
/** the account's own files (its phone's copy on the server) → office files, once each */
function importFiles(userId, officeId) {
  const have = new Set(db.prepare('SELECT id FROM office_files WHERE office_id = ?').all(officeId).map((r) => r.id))
  const put = db.prepare('INSERT INTO office_files (id, office_id, data, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
  let n = 0
  for (const { table, key, row } of require('./syncRoutes').rowsOf(userId)) {
    if (table !== 'properties' || !row || row.status === 'archived') continue
    const id = 'p:' + userId + ':' + key
    if (have.has(id)) continue
    const file = {
      title: String(row.title || 'فایل'), kind: KIND_OF[row.transaction_type] || 'فروش', propertyType: row.property_type || '',
      city: row.city || 'تهران', region: row.region || '', address: row.address || '', size: row.area ?? null, rooms: row.rooms ?? null,
      price: row.price ?? null, deposit: row.deposit_amount ?? null, rent: row.rent_amount ?? null, description: row.description || '',
      ownerName: '', ownerPhone: ''
    }
    put.run(id, officeId, seal(file), row.created_at || now(), now(), new Date(Date.now() + FILE_DAYS * DAY).toISOString())
    n++
  }
  return n
}

/** sales management: approve → the office opens for that account, with its files */
function approveRequest(id, actor) {
  const r = db.prepare('SELECT * FROM office_requests WHERE id = ?').get(id)
  if (!r) return { error: 'not_found' }
  if (r.status !== 'pending') return { error: r.status === 'cancelled' ? 'cancelled' : 'not_pending' }
  let imported = 0
  db.transaction(() => {
    db.prepare("UPDATE office_requests SET status = 'approved', decided_at = ?, decided_by = ? WHERE id = ?").run(now(), actor, id)
    let office = db.prepare('SELECT * FROM offices WHERE owner_user_id = ?').get(r.user_id)
    if (!office) {
      const settings = Object.fromEntries(
        require('./syncRoutes').rowsOf(r.user_id).filter((x) => x.table === 'application_settings').map((x) => [x.key, x.row?.value])
      )
      office = { id: generateId(), name: String(settings.agency_name || settings.display_name || 'دفتر املاک').slice(0, 80) }
      db.prepare('INSERT INTO offices (id, owner_user_id, name, rules, created_at) VALUES (?, ?, ?, NULL, ?)').run(office.id, r.user_id, office.name, now())
    }
    giveDefault(office.id) // #6289: once per office; a re-approval gives nothing new
    imported = importFiles(r.user_id, office.id)
  })()
  return { ok: true, imported }
}
/** sales management: turn an approved panel off → the account's app works again; the office's files stay for a later approval */
function endPortal(id, actor) {
  const r = db.prepare('SELECT * FROM office_requests WHERE id = ?').get(id)
  if (!r) return { error: 'not_found' }
  if (r.status !== 'approved' || r.ended_at) return { error: 'not_on' }
  db.transaction(() => {
    db.prepare('UPDATE office_requests SET ended_at = ?, ended_by = ? WHERE id = ?').run(now(), actor, id)
    const office = db.prepare('SELECT id FROM offices WHERE owner_user_id = ?').get(r.user_id)
    if (office) db.prepare('DELETE FROM office_sessions WHERE office_id = ?').run(office.id) // open dashboards sign out
  })()
  return { ok: true }
}
function rejectRequest(id, actor) {
  const r = db.prepare('SELECT status FROM office_requests WHERE id = ?').get(id)
  if (!r) return { error: 'not_found' }
  if (r.status !== 'pending') return { error: r.status === 'cancelled' ? 'cancelled' : 'not_pending' }
  db.prepare("UPDATE office_requests SET status = 'rejected', decided_at = ?, decided_by = ? WHERE id = ?").run(now(), actor, id)
  return { ok: true }
}
/** sales management's list, newest first, with the account's phone and name */
function listRequests(status) {
  const rows = db
    .prepare(`SELECT r.*, u.phone_number FROM office_requests r JOIN users u ON u.id = r.user_id ${status ? 'WHERE r.status = ?' : ''} ORDER BY r.created_at DESC LIMIT 500`)
    .all(...(status ? [status] : []))
  return rows.map((r) => ({ ...requestView(r), userId: r.user_id, phone: r.phone_number, name: displayName(r.user_id), decidedBy: r.decided_by }))
}
/** sales management's «فعالیت داشبوردها»: per office — files, advisers, sends, last visit */
function officeActivity() {
  const one = (sql, id) => db.prepare(sql).get(id)
  return db.prepare('SELECT * FROM offices ORDER BY created_at DESC').all().map((o) => ({
    officeId: o.id,
    name: o.name,
    userId: o.owner_user_id,
    phone: one('SELECT phone_number FROM users WHERE id = ?', o.owner_user_id)?.phone_number ?? null,
    files: one('SELECT COUNT(*) n FROM office_files WHERE office_id = ? AND archived_at IS NULL', o.id).n,
    advisers: one('SELECT COUNT(*) n FROM office_advisers WHERE office_id = ? AND ended_at IS NULL', o.id).n,
    sends: one('SELECT COUNT(*) n FROM office_shares WHERE office_id = ?', o.id).n,
    lastVisit: one('SELECT MAX(created_at) at FROM office_sessions WHERE office_id = ?', o.id).at,
    portalOn: portalOn(o.owner_user_id),
    tokens: { balance: officeBalance(o.id) } // #6289
  }))
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
  if (!portalOn(user.id)) return fail(res, 403, 'not_approved', NOT_APPROVED)
  let office = db.prepare('SELECT * FROM offices WHERE owner_user_id = ?').get(user.id)
  if (!office) {
    const name = text(req.body.officeName, 80)
    if (!name) return fail(res, 404, 'no_office', 'نام دفتر را بنویسید.')
    office = { id: generateId(), owner_user_id: user.id, name, rules: null, created_at: now() }
    db.prepare('INSERT INTO offices (id, owner_user_id, name, rules, created_at) VALUES (?, ?, ?, ?, ?)').run(
      office.id, office.owner_user_id, office.name, office.rules, office.created_at
    )
    giveDefault(office.id)
  }
  const token = generateSessionToken()
  db.prepare('INSERT INTO office_sessions (token, office_id, created_at) VALUES (?, ?, ?)').run(token, office.id, now())
  db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  res.json({ token, office: { name: office.name } })
})

// POST /office/sso { h } → { token, office } | 404 no_office (+ phone hint) — Amin #5967: the dashboard opens from the
// one panel at kssx.ir/app with no second code. The site signs, server-side at click time:
//   h = base64url(JSON {v:1, phone:"09…", iat, exp: iat+60, nonce}) + "." + base64url(HMAC-SHA256(secret, thatPart))
// secret = /root/kss-secrets/office-sso.secret (AZAR_OFFICE_SSO_SECRET here). Each nonce works once.
db.exec(`CREATE TABLE IF NOT EXISTS office_sso_nonces (nonce TEXT PRIMARY KEY, used_at TEXT NOT NULL)`)
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function handoff(h) {
  const secret = (process.env.AZAR_OFFICE_SSO_SECRET || '').trim()
  if (!secret || typeof h !== 'string' || h.length > 600) return null
  const [part, sig] = h.split('.')
  if (!part || !sig) return null
  const want = Buffer.from(b64url(crypto.createHmac('sha256', secret).update(part).digest()))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null
  let body
  try {
    body = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
  const t = Date.now() / 1000
  if (body?.v !== 1 || !/^09\d{9}$/.test(body.phone) || typeof body.nonce !== 'string' || !/^[a-f0-9]{16,64}$/.test(body.nonce)) return null
  if (!(body.iat <= t + 30 && body.exp >= t - 30 && body.exp - body.iat <= 120)) return null
  const fresh = db.prepare('INSERT OR IGNORE INTO office_sso_nonces (nonce, used_at) VALUES (?, ?)').run(body.nonce, now()).changes === 1
  db.prepare('DELETE FROM office_sso_nonces WHERE used_at < ?').run(new Date(Date.now() - DAY).toISOString())
  return fresh ? body.phone : null
}

router.post('/sso', (req, res) => {
  const phone = handoff(req.body?.h)
  if (!phone) return fail(res, 401, 'handoff_invalid', 'ورود از پنل منقضی شده؛ دوباره از پنل وارد شوید.')
  const user = db.prepare('SELECT id FROM users WHERE phone_number IN (?, ?)').get(phone, '+98' + phone.slice(1))
  if (!user) return fail(res, 422, 'no_account', 'این شماره حساب ایوان ندارد؛ برنامهٔ ایوان را نصب کنید و با همین شماره ثبت‌نام کنید.')
  enter(user.id, res)
})

/** an account that passed one of the sign-ins → the dashboard's session, or (first visit) a one-time ticket to name the office */
function enter(userId, res) {
  const user = db.prepare('SELECT id, admin_status FROM users WHERE id = ?').get(userId)
  if (!user) return fail(res, 422, 'no_account', 'این حساب ایوان پیدا نشد.')
  if (user.admin_status === 'locked' || user.admin_status === 'deleted') return fail(res, 403, 'account_locked', 'این حساب بسته است.')
  if (!portalOn(user.id)) return fail(res, 403, 'not_approved', NOT_APPROVED)
  const office = db.prepare('SELECT * FROM offices WHERE owner_user_id = ?').get(user.id)
  if (office) return res.json(openSession(office))
  // the sign-in cannot be repeated, so the name step gets a short one-time ticket
  const ticket = generateSessionToken()
  db.prepare('INSERT INTO office_sso_nonces (nonce, used_at) VALUES (?, ?)').run('t:' + ticket + ':' + user.id, now())
  res.status(404).json({ error: { code: 'no_office', message: 'نام دفتر را بنویسید.' }, ticket })
}

// POST /office/sso/open { ticket, officeName } → { token, office }: the first visit from the panel names the office
router.post('/sso/open', (req, res) => {
  const ticket = typeof req.body?.ticket === 'string' ? req.body.ticket : ''
  const row = ticket && db.prepare("SELECT nonce, used_at FROM office_sso_nonces WHERE nonce LIKE ?").get('t:' + ticket.replace(/[%_]/g, '') + ':%')
  if (!row || Date.parse(row.used_at) < Date.now() - 15 * 60 * 1000) return fail(res, 401, 'handoff_invalid', 'ورود از پنل منقضی شده؛ دوباره از پنل وارد شوید.')
  const name = text(req.body.officeName, 80)
  if (!name) return fail(res, 422, 'invalid', 'نام دفتر را بنویسید.')
  const userId = row.nonce.split(':')[2]
  db.prepare('DELETE FROM office_sso_nonces WHERE nonce = ?').run(row.nonce)
  let office = db.prepare('SELECT * FROM offices WHERE owner_user_id = ?').get(userId)
  if (!office) {
    office = { id: generateId(), owner_user_id: userId, name, created_at: now() }
    db.prepare('INSERT INTO offices (id, owner_user_id, name, rules, created_at) VALUES (?, ?, ?, NULL, ?)').run(office.id, userId, name, office.created_at)
    giveDefault(office.id)
  }
  res.json(openSession(office))
})

function openSession(office) {
  const token = generateSessionToken()
  db.prepare('INSERT INTO office_sessions (token, office_id, created_at) VALUES (?, ?, ?)').run(token, office.id, now())
  return { token, office: { name: office.name } }
}

// Everything below needs the dashboard's session
const manager = express.Router()
manager.use((req, res, next) => {
  const office = officeOf(req)
  if (!office || !portalOn(office.owner_user_id)) return fail(res, 401, 'session_revoked', 'دوباره وارد شوید.')
  req.office = office
  next()
})

manager.post('/logout', (req, res) => {
  db.prepare('DELETE FROM office_sessions WHERE token = ?').run(req.get('x-office-token'))
  res.status(204).end()
})

manager.get('/overview', async (req, res, next) => {
  try {
    // Amin #6269: each file's tokens at today's price (what one more recipient costs) and the office's balance
    const s = await tokens.settings()
    const o = overviewOf(req.office)
    const cost = (f) => (s ? fileTokens(Object.fromEntries(Object.entries(f).filter(([k]) => !['id', 'createdAt', 'expiresAt', 'sentTo'].includes(k))), s) : null)
    res.json({ ...o, files: o.files.map((f) => ({ ...f, tokens: cost(f) })), tokens: { balance: officeBalance(req.office.id), priced: !!s } })
  } catch (e) {
    next(e)
  }
})

manager.post('/files', async (req, res, next) => {
  try {
    const { file, error } = fileFrom(req.body || {})
    if (error) return fail(res, 422, 'invalid_file', error)
    const cost = fileTokens(file, await tokens.settings())
    if (cost === null) return fail(res, 503, 'tokens_unavailable', 'الان توکن‌ها خوانده نمی‌شوند؛ کمی بعد دوباره امتحان کنید.')
    const id = generateId()
    const at = now()
    const short = db.transaction(() => {
      const balance = officeBalance(req.office.id)
      if (balance < cost) return { balance }
      db.prepare('INSERT INTO office_files (id, office_id, data, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, req.office.id, seal(file), at, at, new Date(Date.now() + FILE_DAYS * DAY).toISOString()
      )
      tokens.post(officeAccount(req.office.id), 'office_file_hold', -cost, `office-hold:${id}`, id, at)
      return null
    })()
    if (short) return tokensShort(res, short.balance, cost)
    res.status(201).json({ id, tokens: cost, balance: officeBalance(req.office.id) })
  } catch (e) {
    next(e)
  }
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
// Amin #6269: «all» is the advisers linked now (each one is a recipient the office pays for), no longer a wildcard row
manager.post('/share', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.fileIds) ? [...new Set(req.body.fileIds.filter((x) => typeof x === 'string'))] : []
    const linkedList = advisersOf(req.office.id).map((a) => a.id)
    const linked = new Set(linkedList)
    const to = req.body?.to === 'all' ? linkedList : Array.isArray(req.body?.to) ? [...new Set(req.body.to.filter((x) => linked.has(x)))] : []
    if (ids.length === 0 || to.length === 0) return fail(res, 422, 'nothing_to_send', 'فایل و مشاور را انتخاب کنید.')
    const rows = Object.fromEntries(
      db.prepare('SELECT * FROM office_files WHERE office_id = ? AND archived_at IS NULL').all(req.office.id).map((r) => [r.id, r])
    )
    if (!ids.every((id) => rows[id])) return fail(res, 404, 'not_found', 'فایل پیدا نشد.')
    const s = await tokens.settings()
    if (!s) return fail(res, 503, 'tokens_unavailable', 'الان توکن‌ها خوانده نمی‌شوند؛ کمی بعد دوباره امتحان کنید.')
    const fields = ['specs', ...FIELDS.slice(1).filter((k) => req.body?.fields?.[k] === true)]
    const had = db.prepare('SELECT 1 FROM office_shares WHERE file_id = ? AND adviser_id IN (?, ?)')
    const put = db.prepare('INSERT OR REPLACE INTO office_shares (office_id, file_id, adviser_id, fields, shared_at) VALUES (?, ?, ?, ?, ?)')
    const out = db.transaction(() => {
      // a recipient who already has the file (sent before, or by an old «all» row) costs nothing again
      const plan = ids.map((id) => {
        const fresh = to.filter((a) => !had.get(id, a, '*'))
        return { id, fresh, cost: fileTokens(open(rows[id].data), s) * fresh.length }
      })
      const needed = plan.reduce((a, p) => a + p.cost, 0)
      const balance = officeBalance(req.office.id)
      if (balance < needed) return { short: { balance, needed } }
      const at = now()
      for (const p of plan) {
        to.forEach((a) => put.run(req.office.id, p.id, a, JSON.stringify(fields), at))
        if (p.fresh.length) {
          tokens.post(officeAccount(req.office.id), 'office_file_share', -p.cost,
            `office-share:${p.id}:${crypto.createHash('sha256').update([...p.fresh].sort().join(',')).digest('hex').slice(0, 32)}`,
            `${p.id}|${p.fresh.length}`, at)
        }
      }
      return { sent: ids.length * to.length, tokens: needed }
    })()
    if (out.short) return tokensShort(res, out.short.balance, out.short.needed)
    res.json({ ...out, balance: officeBalance(req.office.id) })
  } catch (e) {
    next(e)
  }
})

// GET /office/tokens → the balance, every line (newest first), what one token costs and whether buying is open
manager.get('/tokens', async (req, res, next) => {
  try {
    const titles = Object.fromEntries(
      db.prepare('SELECT id, data FROM office_files WHERE office_id = ?').all(req.office.id).map((r) => [r.id, open(r.data).title || 'بی‌نام'])
    )
    const lines = db
      .prepare('SELECT at, reason, amount, ref FROM token_ledger WHERE account_id = ? ORDER BY at DESC LIMIT 300')
      .all(officeAccount(req.office.id))
      .map((l) => {
        const [fileId, n] = String(l.ref || '').split('|')
        const what = l.reason === 'office_file_hold' ? `افزودن فایل «${titles[fileId] ?? 'حذف‌شده'}»`
          : l.reason === 'office_file_share' ? `فرستادن «${titles[fileId] ?? 'حذف‌شده'}» برای ${Number(n || 0).toLocaleString('fa-IR')} مشاور`
            : l.reason === 'pack_bought' ? 'خرید توکن'
              : l.reason === 'admin_grant' ? 'هدیهٔ KSS' : l.reason === 'admin_deduct' ? 'کسر توسط KSS'
                : l.reason === 'office_default' ? 'توکن هدیهٔ شروع دفتر' : l.reason
        return { at: l.at, kind: l.reason, what, amount: l.amount }
      })
    const owner = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(req.office.owner_user_id)
    const p = await appPrices()
    const price = purchases.priceOf(p, 1)
    const closed = price.off ?? purchases.officeClosed(owner?.phone_number || '')
    const orders = db
      .prepare("SELECT * FROM token_orders WHERE account_id = ? AND status <> 'failed' ORDER BY created_at DESC LIMIT 50")
      .all(officeAccount(req.office.id))
      .map(purchases.orderView)
    res.json({
      balance: officeBalance(req.office.id),
      lines,
      buy: { open: closed === null, reason: closed, unitToman: price.off ? null : price.unitToman, minTokens: purchases.minOf(p) },
      orders
    })
  } catch (e) {
    next(e)
  }
})
// POST /office/tokens/quote { tokens } → { quote } (the price as pricing has it now; the dashboard never computes it)
manager.post('/tokens/quote', async (req, res, next) => {
  try {
    const p = await appPrices()
    const n = Number(req.body?.tokens)
    const min = purchases.minOf(p)
    if (min === null) return fail(res, 409, 'min_unset', 'فروش توکن فعلاً بسته است.')
    if (!Number.isInteger(n) || n < min) return fail(res, 422, 'invalid_tokens', `کمترین خرید ${min.toLocaleString('fa-IR')} توکن است.`)
    const q = purchases.priceOf(p, n)
    if (q.off) return fail(res, 409, q.off, 'فروش توکن فعلاً بسته است.')
    res.json({ quote: { tokens: n, ...q } })
  } catch (e) {
    next(e)
  }
})
// POST /office/tokens/buy { tokens } (Idempotency-Key) → { order, payUrl }: billing's gateway, then back to the dashboard
manager.post('/tokens/buy', async (req, res, next) => {
  try {
    const idem = String(req.get('idempotency-key') || '').slice(0, 100)
    if (!idem) return fail(res, 422, 'idempotency_key_required', 'Send an Idempotency-Key.')
    const owner = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(req.office.owner_user_id)
    const r = await purchases.startOrder({ accountId: officeAccount(req.office.id), phone: owner?.phone_number || '', count: Number(req.body?.tokens), idem,
      closed: () => purchases.officeClosed(owner?.phone_number || '') })
    if (r.error) return fail(res, r.status, r.error, /[؀-ۿ]/.test(r.message) ? r.message : 'فروش توکن فعلاً بسته است.')
    res.json(r.body)
  } catch (e) {
    next(e)
  }
})
// POST /office/tokens/status { orderId } → { order } (also asks billing, so a lost notice is caught up)
manager.post('/tokens/status', async (req, res, next) => {
  try {
    const o = db.prepare('SELECT * FROM token_orders WHERE id = ? AND account_id = ?').get(String(req.body?.orderId || ''), officeAccount(req.office.id))
    if (!o) return fail(res, 404, 'not_found', 'این خرید پیدا نشد.')
    res.json({ order: purchases.orderView(await purchases.reconcile(o)) })
  } catch (e) {
    next(e)
  }
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


// The app's side of the request (Amin #5970): status, send, cancel — with the app's own session
adviser.post('/request/status', (req, res) => res.json({ request: requestView(lastRequest(req.adviserId)), portal: portalOn(req.adviserId) }))
adviser.post('/request', async (req, res) => {
  const last = lastRequest(req.adviserId)
  if (last && (last.status === 'pending' || (last.status === 'approved' && !last.ended_at))) return fail(res, 409, 'already', 'درخواست قبلاً ثبت شده است.')
  const address = text(req.body?.address, 300)
  const landline = toLatin(text(req.body?.landline, 20)).replace(/\D/g, '')
  if (!address) return fail(res, 422, 'invalid_address', 'آدرس دفتر را بنویسید.')
  if (landline && !LANDLINE.test(landline)) return fail(res, 422, 'invalid_landline', 'شمارهٔ تلفن ثابت را با پیش‌شماره بنویسید.')
  // Amin #6034: the office dashboard's own username + password, chosen on the request (the dashboard only, never kssx.ir)
  const username = usernameOf(req.body?.username)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!USERNAME.test(username)) return fail(res, 422, 'invalid_username', 'نام کاربری ۴ تا ۳۲ حرف انگلیسی، عدد، نقطه یا _ باشد.')
  if (password.length < PASSWORD_MIN || password.length > 128) return fail(res, 422, 'weak_password', 'رمز دست‌کم ۸ حرف باشد.')
  const TAKEN = 'این نام کاربری گرفته شده؛ نام دیگری بنویسید.'
  if (usernameTaken(username)) return fail(res, 409, 'username_taken', TAKEN)
  const elsewhere = await usernameTakenElsewhere(username)
  if (elsewhere === null) return fail(res, 503, 'username_check_failed', 'بررسی نام کاربری الان ممکن نشد؛ کمی بعد دوباره بفرستید.')
  if (elsewhere) return fail(res, 409, 'username_taken', TAKEN)
  try {
    db.prepare("INSERT INTO office_requests (id, user_id, address, union_licence, landline, status, created_at, username, password_hash) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)").run(
      generateId(), req.adviserId, address, req.body?.unionLicence === true ? 1 : 0, landline || null, now(), username, hashPassword(password)
    )
  } catch (e) {
    if (String(e?.code).startsWith('SQLITE_CONSTRAINT')) return fail(res, 409, 'username_taken', TAKEN)
    throw e
  }
  res.status(201).json({ request: requestView(lastRequest(req.adviserId)), portal: false })
})
adviser.post('/request/cancel', (req, res) => {
  const last = lastRequest(req.adviserId)
  if (!last || last.status !== 'pending') return fail(res, 409, 'not_pending', 'درخواستی در انتظار نیست.')
  db.prepare("UPDATE office_requests SET status = 'cancelled', decided_at = ? WHERE id = ?").run(now(), last.id)
  res.json({ request: requestView(lastRequest(req.adviserId)), portal: false })
})


// ------------------------------------------------- dashboard sign-in: password (#6034), «ورود با ایوان» (#6033) ----
// Password: chosen on the request, kept only as a scrypt hash (salted, memory-hard); 5 wrong tries lock the username
// for 15 minutes. «ورود با ایوان»: the dashboard shows a short code (and its QR); the account's own EYVAN app, signed in,
// confirms it; the dashboard, polling with its private ticket, then gets the session. A code lives 2 minutes, works once.
db.exec(`
  CREATE INDEX IF NOT EXISTS office_requests_username ON office_requests(username);
  CREATE TABLE IF NOT EXISTS office_login_fails (username TEXT PRIMARY KEY, fails INTEGER NOT NULL, locked_until TEXT);
  CREATE TABLE IF NOT EXISTS office_links (
    code TEXT PRIMARY KEY, poll TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, user_id TEXT, confirmed_at TEXT
  );
`)
const LOCK_AFTER = 5
const LOCK_MINUTES = 15
const LINK_SECONDS = 120
const signInLimit = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })

// POST /office/password { username, password } → { token, office } | 404 no_office + ticket (then /office/sso/open)
router.post('/password', signInLimit, (req, res) => {
  const username = usernameOf(req.body?.username)
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 128) : ''
  const lock = db.prepare('SELECT * FROM office_login_fails WHERE username = ?').get(username)
  if (lock?.locked_until && Date.parse(lock.locked_until) > Date.now()) {
    return fail(res, 429, 'login_locked', 'چند بار رمز اشتباه وارد شد؛ ۱۵ دقیقهٔ دیگر دوباره امتحان کنید.')
  }
  const r = USERNAME.test(username)
    ? db.prepare("SELECT user_id, password_hash FROM office_requests WHERE username = ? AND status = 'approved' AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1").get(username)
    : null
  const ok = passwordMatches(password, r?.password_hash) && !!r // the hash always runs, so an unknown name takes as long
  if (!ok) {
    const fails = (lock?.fails ?? 0) + 1
    const lockedUntil = fails >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null
    db.prepare('INSERT OR REPLACE INTO office_login_fails (username, fails, locked_until) VALUES (?, ?, ?)').run(username, lockedUntil ? 0 : fails, lockedUntil)
    return fail(res, 422, 'wrong_login', 'نام کاربری یا رمز درست نیست.')
  }
  db.prepare('DELETE FROM office_login_fails WHERE username = ?').run(username)
  enter(r.user_id, res)
})

// POST /office/link/start → { code, poll, expiresAt }: the dashboard shows the code and its QR («eyvan://office-link?c=…»)
router.post('/link/start', signInLimit, (_req, res) => {
  db.prepare('DELETE FROM office_links WHERE expires_at < ?').run(new Date(Date.now() - 60 * 1000).toISOString())
  let code
  do code = String(crypto.randomInt(10000000, 100000000))
  while (db.prepare('SELECT 1 FROM office_links WHERE code = ?').get(code))
  const poll = generateSessionToken()
  const expiresAt = new Date(Date.now() + LINK_SECONDS * 1000).toISOString()
  db.prepare('INSERT INTO office_links (code, poll, created_at, expires_at) VALUES (?, ?, ?, ?)').run(code, poll, now(), expiresAt)
  res.status(201).json({ code, poll, expiresAt })
})

// POST /office/link/poll { poll } → { pending: true } | { token, office } | 404 no_office + ticket | 410 link_expired
router.post('/link/poll', (req, res) => {
  const poll = typeof req.body?.poll === 'string' ? req.body.poll : ''
  const row = poll && db.prepare('SELECT * FROM office_links WHERE poll = ?').get(poll)
  if (!row || (!row.confirmed_at && Date.parse(row.expires_at) <= Date.now())) return fail(res, 410, 'link_expired', 'کد منقضی شد؛ کد تازه بگیرید.')
  if (!row.confirmed_at) return res.json({ pending: true })
  db.prepare('DELETE FROM office_links WHERE code = ?').run(row.code) // once
  enter(row.user_id, res)
})

// POST /office/adviser/link/confirm { sessionToken, code } → { ok }: the app confirms the code it scanned or typed.
// Never 401 here — the app reads 401 as «signed out».
adviser.post('/link/confirm', signInLimit, (req, res) => {
  const code = (toLatin(text(req.body?.code, 80)).match(/(\d{8})/) || [])[1] || ''
  const row = code && db.prepare('SELECT * FROM office_links WHERE code = ?').get(code)
  if (!row || row.confirmed_at || Date.parse(row.expires_at) <= Date.now()) return fail(res, 410, 'link_expired', 'این کد منقضی یا استفاده شده؛ در داشبورد کد تازه بگیرید.')
  if (!portalOn(req.adviserId)) return fail(res, 403, 'not_approved', NOT_APPROVED)
  db.prepare('UPDATE office_links SET user_id = ?, confirmed_at = ? WHERE code = ? AND confirmed_at IS NULL').run(req.adviserId, now(), code)
  res.json({ ok: true })
})

router.use('/adviser', adviser)
router.use(manager)

module.exports = { router, officeBalance, officeAccount, giveDefault, giveMissingDefaults, OFFICE_DEFAULT_TOKENS, portalOn, usernameOf, usernameTaken, listRequests, approveRequest, rejectRequest, endPortal, officeActivity }
