// KSS (Amin #5197): the nightly backup job. Run: npm test (node's own test runner)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-nightly-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.EYVAN_BACKUP_DIR = path.join(dir, 'nightly')
fs.writeFileSync(path.join(dir, 'admin.key'), crypto.randomBytes(32).toString('hex') + '\n')
process.env.AZAR_ADMIN_KEY_FILE = path.join(dir, 'admin.key')

const db = require('../src/db')
const nightly = require('../src/nightly')

const addUser = (id, phone) =>
  db.prepare('INSERT INTO users (id, phone_number, referral_code, created_at) VALUES (?, ?, ?, ?)').run(id, phone, `R${id}`, new Date().toISOString())

test('one plain zip per live account (Amin #5281), listed as pending until the PC marks it', () => {
  addUser('u1', '09120000001')
  addUser('u2', '09120000002')
  db.prepare("UPDATE users SET deleted_at = ? WHERE id = 'u2'").run(new Date().toISOString())
  const now = new Date('2026-10-25T21:00:00Z') // 00:30 on 26 Oct in Tehran
  const result = nightly.run(now)
  assert.equal(result.date, '2026-10-26')
  assert.equal(result.users, 1)
  const file = path.join(dir, 'nightly', '2026-10-26', '09120000001-2026-10-26.zip')
  const zip = fs.readFileSync(file)
  assert.equal(zip.subarray(0, 2).toString(), 'PK')
  assert.ok(zip.includes(Buffer.from('data.json')))

  assert.deepEqual(nightly.list().pending, [{ date: '2026-10-26', files: ['09120000001-2026-10-26.zip'] }])
  assert.equal(nightly.mark('2026-10-26', 'uploaded'), 1)
  assert.deepEqual(nightly.list().pending, [])
  assert.equal(db.prepare('SELECT drive FROM admin_backups').get().drive, 'uploaded')
})

test('retention keeps 14 days plus 8 Sundays', () => {
  const dates = []
  for (let i = 0; i < 100; i++) dates.push(new Date(Date.UTC(2026, 9, 26) - i * 864e5).toISOString().slice(0, 10))
  const keep = nightly.keepSet(dates)
  assert.equal(keep.size, 14 + 6) // two of the newest 8 Sundays already fall inside the 14 days
  assert.ok(keep.has('2026-10-26') && keep.has('2026-10-13') && !keep.has('2026-10-12'))
  assert.ok(keep.has('2026-09-06') && !keep.has('2026-08-30'))
})
