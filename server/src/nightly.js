/**
 * Amin #5197: the nightly job (systemd timer azar-nightly, 00:00 Asia/Tehran, runs as the azar-auth user).
 *   node src/nightly.js                     purge due deletions, then one encrypted zip per account into
 *                                           $EYVAN_BACKUP_DIR/<yyyy-mm-dd>/<phone>-<yyyy-mm-dd>.zip.enc, then retention
 *   node src/nightly.js --list              JSON for the PC uploader: { pending: [{ date, files }], keep: [dates] }
 *   node src/nightly.js --mark <date> <uploaded|failed>
 *   node src/nightly.js --decrypt <in> <out.zip>   (restore; needs EYVAN_BACKUP_KEY)
 * The Drive upload runs on the PC (tools/drive-sync/eyvan_backups.py), so the Google sign-in never sits on the VPS;
 * while it can't run, days stay «pending» here and go up on its next good run.
 * File format: "EYVB1" | 12-byte IV | 16-byte GCM tag | AES-256-GCM ciphertext of the zip.
 */
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const MAGIC = Buffer.from('EYVB1')
const DIR = process.env.EYVAN_BACKUP_DIR || '/var/backups/eyvan-nightly'
const KEEP_DAILY = 14
const KEEP_WEEKLY = 8

function backupKey() {
  const raw = String(process.env.EYVAN_BACKUP_KEY || '').trim()
  if (!/^[0-9a-f]{64}$/i.test(raw)) throw new Error('EYVAN_BACKUP_KEY must be 64 hex characters')
  return Buffer.from(raw, 'hex')
}

function encrypt(buffer, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(buffer), cipher.final()])
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body])
}

function decrypt(buffer, key) {
  if (!buffer.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('not an EYVAN backup file')
  const iv = buffer.subarray(5, 17)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(buffer.subarray(17, 33))
  return Buffer.concat([decipher.update(buffer.subarray(33)), decipher.final()])
}

/** the calendar date in Tehran, yyyy-mm-dd */
function tehranDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(now)
}

/** retention: the newest 14 days, plus the newest 8 Sundays */
function keepSet(dates) {
  const sorted = [...dates].sort().reverse()
  const keep = new Set(sorted.slice(0, KEEP_DAILY))
  sorted.filter((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 0).slice(0, KEEP_WEEKLY).forEach((d) => keep.add(d))
  return keep
}

function dayDirs() {
  if (!fs.existsSync(DIR)) return []
  return fs.readdirSync(DIR).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
}

function db() {
  return require('./db')
}

function ensureTable() {
  db().exec(`CREATE TABLE IF NOT EXISTS admin_backups (
    date TEXT PRIMARY KEY, users INTEGER NOT NULL, bytes INTEGER NOT NULL, drive TEXT NOT NULL, at TEXT NOT NULL
  )`)
}

function run(now = new Date()) {
  const key = backupKey()
  const { purgeDue } = require('./adminRoutes')
  const { buildExport, safeName } = require('./exportAccount')
  const purged = purgeDue(now.getTime())

  const date = tehranDate(now)
  const dayDir = path.join(DIR, date)
  const work = `${dayDir}.part`
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(work, { recursive: true, mode: 0o700 })

  const users = db()
    .prepare("SELECT id, phone_number FROM users WHERE id != 'bootstrap-seed-user' AND deleted_at IS NULL ORDER BY created_at")
    .all()
  let bytes = 0
  const names = new Set()
  for (const user of users) {
    let name = `${safeName(user.phone_number, user.id)}-${date}.zip.enc`
    if (names.has(name)) name = `${user.id}-${date}.zip.enc`
    names.add(name)
    const sealed = encrypt(buildExport(user.id).buffer, key)
    fs.writeFileSync(path.join(work, name), sealed, { mode: 0o600 })
    bytes += sealed.length
  }
  fs.rmSync(dayDir, { recursive: true, force: true })
  fs.renameSync(work, dayDir)

  ensureTable()
  db()
    .prepare('INSERT OR REPLACE INTO admin_backups (date, users, bytes, drive, at) VALUES (?, ?, ?, ?, ?)')
    .run(date, users.length, bytes, 'pending', now.toISOString())

  const keep = keepSet(dayDirs())
  const removed = dayDirs().filter((d) => !keep.has(d))
  for (const d of removed) fs.rmSync(path.join(DIR, d), { recursive: true, force: true })
  if (removed.length) db().prepare(`DELETE FROM admin_backups WHERE date IN (${removed.map(() => '?').join(',')})`).run(...removed)

  return { date, users: users.length, bytes, purged: purged.length, removed }
}

function list() {
  ensureTable()
  const status = new Map(db().prepare('SELECT date, drive FROM admin_backups').all().map((r) => [r.date, r.drive]))
  const dates = dayDirs().sort()
  return {
    pending: dates
      .filter((d) => status.get(d) !== 'uploaded')
      .map((d) => ({ date: d, files: fs.readdirSync(path.join(DIR, d)).filter((f) => f.endsWith('.zip.enc')).sort() })),
    keep: [...keepSet(dates)].sort()
  }
}

function mark(date, state) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !['uploaded', 'failed', 'pending'].includes(state)) {
    throw new Error('usage: --mark <yyyy-mm-dd> <uploaded|failed|pending>')
  }
  ensureTable()
  return db().prepare('UPDATE admin_backups SET drive = ? WHERE date = ?').run(state, date).changes
}

if (require.main === module) {
  const [flag, a, b] = process.argv.slice(2)
  try {
    if (flag === '--list') console.log(JSON.stringify(list()))
    else if (flag === '--mark') console.log(JSON.stringify({ marked: mark(a, b) }))
    else if (flag === '--decrypt') fs.writeFileSync(b, decrypt(fs.readFileSync(a), backupKey()))
    else if (!flag) console.log(JSON.stringify(run()))
    else throw new Error(`unknown option ${flag}`)
  } catch (e) {
    console.error(`nightly: ${e.message}`)
    process.exit(1)
  }
}

module.exports = { run, list, mark, encrypt, decrypt, keepSet, tehranDate }
