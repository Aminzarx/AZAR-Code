/**
 * Amin #5197: the nightly job (systemd timer azar-nightly, 00:00 Asia/Tehran, runs as root).
 *   node src/nightly.js                     purge due deletions, then one zip per account (the export layout: folders
 *                                           and files named by property, applicant and contract) into
 *                                           $EYVAN_BACKUP_DIR/<yyyy-mm-dd>/<phone>-<yyyy-mm-dd>.zip, then retention
 *   node src/nightly.js --list              JSON for the PC uploader: { pending: [{ date, files }], keep: [dates] }
 *   node src/nightly.js --mark <date> <uploaded|failed|pending>
 * Amin #5281: the zips are plain, readable files (no encryption); the folder and files are root-only (0700/0600) and
 * the Drive folder is private. The Drive upload runs on the PC (tools/drive-sync/eyvan_backups.py), so the Google
 * sign-in never sits on the VPS; while it can't run, days stay «pending» here and go up on its next good run.
 * KSS test accounts (numbers in AZAR_TEST_OTP_NUMBERS) are left out (#5292).
 * Run as root, the job hands the database's -wal/-shm files back to the database's owner, so azar-auth keeps working.
 */
const fs = require('node:fs')
const path = require('node:path')

const DIR = process.env.EYVAN_BACKUP_DIR || '/root/kss-backups/eyvan-nightly'
const KEEP_DAILY = 14
const KEEP_WEEKLY = 8

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

/** a root run must not leave root-owned -wal/-shm files behind: azar-auth (the database's owner) could not open them */
function handBackDbFiles() {
  const dbPath = process.env.AZAR_DB_PATH
  if (!dbPath || typeof process.getuid !== 'function' || process.getuid() !== 0) return
  try {
    const { uid, gid } = fs.statSync(dbPath)
    for (const extra of ['-wal', '-shm']) if (fs.existsSync(dbPath + extra)) fs.chownSync(dbPath + extra, uid, gid)
  } catch {
    // nothing to hand back
  }
}

function run(now = new Date()) {
  const { purgeDue } = require('./adminRoutes')
  const { buildExport, safeName } = require('./exportAccount')
  const { isTestNumber } = require('./sms')
  const purged = purgeDue(now.getTime())

  const date = tehranDate(now)
  const dayDir = path.join(DIR, date)
  const work = `${dayDir}.part`
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 })
  fs.mkdirSync(work, { recursive: true, mode: 0o700 })

  const users = db()
    .prepare("SELECT id, phone_number FROM users WHERE id != 'bootstrap-seed-user' AND deleted_at IS NULL ORDER BY created_at")
    .all()
    .filter((u) => !isTestNumber(u.phone_number)) // Amin #5292: KSS test accounts stay out of the backup
  let bytes = 0
  const names = new Set()
  for (const user of users) {
    let name = `${safeName(user.phone_number, user.id)}-${date}.zip`
    if (names.has(name)) name = `${user.id}-${date}.zip`
    names.add(name)
    const zip = buildExport(user.id).buffer
    fs.writeFileSync(path.join(work, name), zip, { mode: 0o600 })
    bytes += zip.length
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
      .map((d) => ({ date: d, files: fs.readdirSync(path.join(DIR, d)).filter((f) => f.endsWith('.zip')).sort() })),
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
    else if (!flag) console.log(JSON.stringify(run()))
    else throw new Error(`unknown option ${flag}`)
  } catch (e) {
    console.error(`nightly: ${e.message}`)
    process.exitCode = 1
  } finally {
    handBackDbFiles()
  }
}

module.exports = { run, list, mark, keepSet, tehranDate }
