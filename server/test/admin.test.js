// KSS (Amin #5197): the billing panel's admin API. Run: npm test (node's own test runner)
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const zlib = require('node:zlib')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-admin-test-'))
const KEY = crypto.randomBytes(32).toString('hex')
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.KSS_PRICING_KEY = 'reader-key'
process.env.AZAR_LICENCE_KEY = crypto
  .generateKeyPairSync('ed25519')
  .privateKey.export({ format: 'der', type: 'pkcs8' })
  .toString('base64')
fs.writeFileSync(path.join(dir, 'admin.key'), KEY + '\n')
process.env.AZAR_ADMIN_KEY_FILE = path.join(dir, 'admin.key')

const pricing = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({
      apps: [
        { key: 'eyvan_token_allowance', value: 100 },
        { key: 'eyvan_tokens_per_kb', value: 0.127 },
        { key: 'eyvan_trial_days', value: 30 }
      ].map((a) => ({ ...a, price_toman: null }))
    })
  )
})

let db, admin, server, base
before(async () => {
  await new Promise((resolve) => pricing.listen(0, '127.0.0.1', resolve))
  process.env.KSS_PRICING_URL = `http://127.0.0.1:${pricing.address().port}`
  const express = require('express')
  db = require('../src/db')
  const authRoutes = require('../src/authRoutes')
  const sync = require('../src/syncRoutes')
  const licence = require('../src/licenceRoutes')
  const tokens = require('../src/tokens')
  admin = require('../src/adminRoutes')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/sync', sync.router)
  app.use(express.json())
  app.use('/auth', authRoutes)
  app.use('/licence', licence.router)
  app.use('/tokens', tokens.router)
  app.use('/admin', admin.router)
  app.use('/announcements', require('../src/announcements').router)
  app.use('/presence', require('../src/presence').router)
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
  pricing.close()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

let requests = 0
async function post(route, body) {
  const res = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.2.${++requests >> 8}.${requests & 255}` },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

async function call(method, route, body, headers = {}) {
  const res = await fetch(`${base}/admin${route}`, {
    method,
    headers: { authorization: `Bearer ${KEY}`, 'x-admin-actor': 'test-admin', 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  })
  const type = res.headers.get('content-type') || ''
  return { status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), headers: res.headers }
}

let nextPhone = 300
async function signIn(phoneNumber) {
  await post('/auth/send-otp', { phoneNumber })
  await post('/auth/verify-otp', { phoneNumber, code: '123456' })
  return post('/auth/login', { phoneNumber })
}
async function account() {
  const phoneNumber = `+98912000${String(++nextPhone).padStart(4, '0')}`
  await post('/auth/send-otp', { phoneNumber })
  await post('/auth/verify-otp', { phoneNumber, code: '123456' })
  const res = await post('/auth/register', { phoneNumber, referralCode: 'AMINZX' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return { ...res.body, phoneNumber }
}

/** zip entry names (central directory) */
function zipNames(buf) {
  const names = []
  let i = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let p = buf.readUInt32LE(i + 16)
  const count = buf.readUInt16LE(i + 10)
  for (let n = 0; n < count; n++) {
    const len = buf.readUInt16LE(p + 28)
    const extra = buf.readUInt16LE(p + 30)
    const comment = buf.readUInt16LE(p + 32)
    names.push(buf.subarray(p + 46, p + 46 + len).toString('utf8'))
    p += 46 + len + extra + comment
  }
  return names
}
function zipEntry(buf, name) {
  let p = 0
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18)
    const len = buf.readUInt16LE(p + 26)
    const extra = buf.readUInt16LE(p + 28)
    const entryName = buf.subarray(p + 30, p + 30 + len).toString('utf8')
    const data = buf.subarray(p + 30 + len + extra, p + 30 + len + extra + size)
    if (entryName === name) return zlib.inflateRawSync(data).toString('utf8')
    p += 30 + len + extra + size
  }
  return null
}

test('only the same machine with the key and an actor gets in', async () => {
  assert.equal((await call('GET', '/users', null, { authorization: 'Bearer wrong' })).status, 401)
  assert.equal((await call('GET', '/users', null, { 'x-forwarded-for': '1.2.3.4' })).status, 401)
  assert.equal((await call('GET', '/users', null, { 'x-admin-actor': '' })).status, 400)
  assert.equal((await call('GET', '/users')).status, 200)
})

test('list and detail show the account, its profile, counts and tokens; every read is audited', async () => {
  const a = await account()
  const push = await post('/sync/push', {
    sessionToken: a.sessionToken,
    changes: [
      { t: 'application_settings', k: 'display_name', row: { key: 'display_name', value: 'علی رضایی' } },
      { t: 'properties', k: 'p1', row: { id: 'p1', title: 'آپارتمان/ونک', city: 'تهران', price: 1000 } },
      { t: 'properties', k: 'p2', row: { id: 'p2', title: 'آپارتمان/ونک', city: 'تهران' } },
      { t: 'applicants', k: 'a1', row: { id: 'a1', full_name: 'مریم', phone_number: '0912' } },
      { t: 'contracts', k: 'c1', row: { id: 'c1', property_id: 'p1', applicant_id: 'a1', start_date: '1405/01/01', end_date: '1406/01/01' } }
    ]
  })
  assert.equal(push.status, 200, JSON.stringify(push.body))

  const list = await call('GET', `/users?q=${encodeURIComponent(a.phoneNumber.slice(-4))}`)
  assert.equal(list.status, 200)
  const row = list.body.users.find((u) => u.id === a.userId)
  assert.equal(row.name, 'علی رضایی')
  assert.deepEqual(row.counts, { properties: 2, applicants: 1, contracts: 1, deals: 0, photos: 0 })
  assert.equal(row.status, 'active')
  assert.ok(row.lastLoginAt === null || typeof row.lastLoginAt === 'string')

  // the number as staff type it: 0912…, 912…, +98912…, Persian digits
  const local = '0' + a.phoneNumber.replace(/^\+98/, '')
  const persian = local.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
  for (const q of [local, local.slice(1), '+98' + local.slice(1), persian]) {
    const found = await call('GET', `/users?q=${encodeURIComponent(q)}`)
    assert.ok(found.body.users.some((u) => u.id === a.userId), q)
  }

  const detail = await call('GET', `/users/${a.userId}`)
  assert.equal(detail.status, 200)
  assert.equal(detail.body.referralCode, a.referralCode)
  assert.equal(detail.body.wallet, null)
  assert.ok(detail.body.tokens.spent > 0)
  const audit = await call('GET', `/audit?userId=${a.userId}`)
  assert.ok(audit.body.rows.some((r) => r.action === 'read' && r.actor === 'test-admin'))
})

test('grant adds tokens once per idempotency key; extend moves the paid date', async () => {
  const a = await account()
  const before = (await call('GET', `/users/${a.userId}`)).body.tokens.balance
  const g1 = await call('POST', `/users/${a.userId}/tokens/grant`, { amount: 50, note: 'جبران' }, { 'idempotency-key': 'k1' })
  const g2 = await call('POST', `/users/${a.userId}/tokens/grant`, { amount: 50, note: 'جبران' }, { 'idempotency-key': 'k1' })
  assert.equal(g1.status, 200)
  assert.equal(g2.body.tokens.balance, before + 50)
  assert.equal(g2.body.tokens.earnedBy.granted, 50)
  assert.equal((await call('POST', `/users/${a.userId}/tokens/grant`, { amount: -5 })).status, 422)

  const e = await call('POST', `/users/${a.userId}/licence/extend`, { days: 30 })
  assert.equal(e.status, 200)
  assert.ok(Date.parse(e.body.licence.paidUntil) > Date.now() + 29 * 86400000)
  assert.equal(e.body.licence.state, 'active')
})

test('deduct needs a reason, books once per key, and never takes the balance below 0 (#5243)', async () => {
  const a = await account()
  const before = (await call('GET', `/users/${a.userId}`)).body.tokens.balance
  assert.equal((await call('POST', `/users/${a.userId}/tokens/deduct`, { amount: 5 })).status, 422)
  assert.equal((await call('POST', `/users/${a.userId}/tokens/deduct`, { amount: 0, reason: 'x' })).status, 422)
  const d1 = await call('POST', `/users/${a.userId}/tokens/deduct`, { amount: 5, reason: 'خطای ثبت' }, { 'idempotency-key': 'd1' })
  const d2 = await call('POST', `/users/${a.userId}/tokens/deduct`, { amount: 5, reason: 'خطای ثبت' }, { 'idempotency-key': 'd1' })
  assert.equal(d1.status, 200)
  assert.equal(d2.body.tokens.balance, before - 5)
  assert.equal(d2.body.tokens.spentBy.deducted, 5)
  const tooMuch = await call('POST', `/users/${a.userId}/tokens/deduct`, { amount: before, reason: 'بیش از موجودی' })
  assert.equal(tooMuch.status, 409)
  assert.equal(tooMuch.body.error.code, 'insufficient_tokens')
  assert.equal(tooMuch.body.balance, before - 5)
  const lines = (await call('GET', `/users/${a.userId}/tokens`)).body.lines
  assert.ok(lines.some((l) => l.reason === 'admin_deduct' && l.amount === -5 && l.ref === 'خطای ثبت'))
})

test('lock signs out and blocks sign-in; deactivate reads as an ended licence; active undoes both', async () => {
  const a = await account()
  assert.equal((await call('POST', `/users/${a.userId}/status`, { status: 'locked' })).status, 200)
  assert.equal((await post('/tokens/ledger', { sessionToken: a.sessionToken })).status, 401)
  assert.equal((await signIn(a.phoneNumber)).status, 403)

  await call('POST', `/users/${a.userId}/status`, { status: 'deactivated' })
  const s = await signIn(a.phoneNumber)
  assert.equal(s.status, 200)
  const lic = await post('/licence/status', { sessionToken: s.body.sessionToken })
  assert.equal(lic.body.licence.state, 'expired')

  await call('POST', `/users/${a.userId}/status`, { status: 'active' })
  const lic2 = await post('/licence/status', { sessionToken: s.body.sessionToken })
  assert.notEqual(lic2.body.licence.state, 'expired')
})

test('delete is soft for 30 days (restore works), then the nightly purge leaves a tombstone', async () => {
  const a = await account()
  const d = await call('POST', `/users/${a.userId}/delete`, { note: 'درخواست کاربر' })
  assert.equal(d.status, 200)
  assert.equal((await signIn(a.phoneNumber)).status, 403)
  assert.equal((await call('POST', `/users/${a.userId}/restore`)).status, 200)
  assert.equal((await signIn(a.phoneNumber)).status, 200)

  await call('POST', `/users/${a.userId}/delete`)
  assert.deepEqual(admin.purgeDue(Date.now()), [])
  assert.deepEqual(admin.purgeDue(Date.now() + 31 * 86400000), [a.userId])
  const u = db.prepare('SELECT phone_number, deleted_at FROM users WHERE id = ?').get(a.userId)
  assert.equal(u.phone_number, `deleted:${a.userId}`)
  assert.ok(u.deleted_at)
  assert.equal((await call('GET', `/users/${a.userId}`)).status, 404)
})

test('export is a zip of named folders, the lists as CSV and data.json', async () => {
  const a = await account()
  await post('/sync/push', {
    sessionToken: a.sessionToken,
    changes: [
      { t: 'properties', k: 'p1', row: { id: 'p1', title: 'ویلا: شمال', city: 'رامسر' } },
      { t: 'properties', k: 'p2', row: { id: 'p2', title: 'ویلا: شمال' } },
      { t: 'applicants', k: 'a1', row: { id: 'a1', full_name: 'رضا' } },
      { t: 'contracts', k: 'c1', row: { id: 'c1', property_id: 'p1', applicant_id: 'a1', start_date: 'x', end_date: 'y' } }
    ]
  })
  const res = await call('GET', `/users/${a.userId}/export`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-disposition'), /eyvan-.*\.zip/)
  const names = zipNames(res.body)
  assert.ok(names.includes('فایل‌های ملک/ویلا  شمال/مشخصات.txt') || names.includes('فایل‌های ملک/ویلا شمال/مشخصات.txt'), names.join('|'))
  assert.ok(names.some((n) => n.endsWith('(2)/مشخصات.txt')))
  assert.ok(names.includes('متقاضیان/رضا/مشخصات.txt'))
  assert.ok(names.includes('قراردادها/ویلا شمال - رضا/مشخصات.txt'), names.join('|'))
  assert.ok(names.includes('data.json'))
  assert.match(zipEntry(res.body, 'متقاضیان/رضا/مشخصات.txt'), /نام: رضا/)
  assert.ok(zipEntry(res.body, 'فهرست فایل‌ها.csv').startsWith('﻿'))
  const audit = await call('GET', `/audit?userId=${a.userId}`)
  assert.ok(audit.body.rows.some((r) => r.action === 'export'))
})

test('«حذف موقت»: archive frees the number; a new account signs up on it; attach moves the old files in', async () => {
  const old = await account()
  await post('/sync/push', {
    sessionToken: old.sessionToken,
    changes: [
      { t: 'properties', k: 'op1', row: { id: 'op1', owner_id: old.userId, title: 'مغازه' } },
      { t: 'application_settings', k: 'display_name', row: { key: 'display_name', value: 'قدیمی' } }
    ]
  })
  await call('POST', `/users/${old.userId}/licence/extend`, { days: 60 })
  const ar = await call('POST', `/users/${old.userId}/archive`, { note: 'test' })
  assert.equal(ar.status, 200)
  assert.equal((await post('/tokens/ledger', { sessionToken: old.sessionToken })).status, 401)
  const archived = (await call('GET', `/users/${old.userId}`)).body
  assert.equal(archived.status, 'archived')
  assert.equal(archived.phone, old.phoneNumber)

  // the number signs up again as a newcomer
  await post('/auth/send-otp', { phoneNumber: old.phoneNumber })
  await post('/auth/verify-otp', { phoneNumber: old.phoneNumber, code: '123456' })
  const other = await account()
  const fresh = await post('/auth/register', { phoneNumber: old.phoneNumber, referralCode: other.referralCode })
  assert.equal(fresh.status, 201, JSON.stringify(fresh.body))
  await post('/sync/push', {
    sessionToken: fresh.body.sessionToken,
    changes: [{ t: 'application_settings', k: 'display_name', row: { key: 'display_name', value: 'جدید' } }]
  })
  const newDetail = (await call('GET', `/users/${fresh.body.userId}`)).body
  assert.deepEqual(newDetail.archivedAccounts.map((a) => a.id), [old.userId])
  assert.equal((await call('POST', `/users/${old.userId}/unarchive`)).status, 409)

  const oldParent = db.prepare('SELECT referrer_user_id FROM referral_relationships WHERE referred_user_id = ?').get(old.userId).referrer_user_id
  const preview = await call('GET', `/users/${old.userId}/attach-preview?targetId=${fresh.body.userId}`)
  assert.equal(preview.status, 200)
  assert.equal(preview.body.records.properties, 1)
  assert.equal(preview.body.kept, 1)
  assert.equal(preview.body.referrer.from, other.userId)
  assert.equal(preview.body.referrer.to, oldParent)

  const at = await call('POST', `/users/${old.userId}/attach`, { targetId: fresh.body.userId })
  assert.equal(at.status, 200, JSON.stringify(at.body))
  assert.equal(at.body.kept, 1) // display_name: the new account's stays
  const merged = (await call('GET', `/users/${fresh.body.userId}`)).body
  assert.equal(merged.name, 'جدید')
  assert.equal(merged.counts.properties, 1)
  assert.equal(merged.licence.state, 'active')
  assert.deepEqual(merged.archivedAccounts, [])
  const pulled = await post('/sync/pull', { sessionToken: fresh.body.sessionToken })
  const shop = JSON.stringify(pulled.body)
  assert.ok(shop.includes('مغازه') && shop.includes(fresh.body.userId))
  assert.equal((await call('GET', `/users/${old.userId}`)).status, 404)
  // the old referral place came back (#5045); the temporary parent is gone
  assert.equal(at.body.replacedReferrer, other.userId)
  const parent = db.prepare('SELECT referrer_user_id FROM referral_relationships WHERE referred_user_id = ?').get(fresh.body.userId)
  assert.equal(parent.referrer_user_id, oldParent)
})

test('announcements (Amin #5370): written by admin, shown to the app until deleted or dismissed', async () => {
  const a = await account()
  assert.equal((await call('POST', '/announcements', { title: 'x', body: 'y', tone: 'pink' })).status, 422)
  const made = await call('POST', '/announcements', { title: 'خبر', body: 'متن خبر', tone: 'warning' })
  assert.equal(made.status, 201)
  const other = await call('POST', '/announcements', { title: 'دوم', body: 'متن', tone: 'info' })
  const seen = async () => (await post('/announcements', { sessionToken: a.sessionToken })).body.announcements.map((n) => n.id)
  assert.deepEqual((await seen()).sort(), [made.body.id, other.body.id].sort())
  assert.equal((await post(`/announcements/${made.body.id}/dismiss`, { sessionToken: a.sessionToken })).status, 204)
  assert.deepEqual(await seen(), [other.body.id])
  assert.equal((await call('DELETE', `/announcements/${other.body.id}`)).status, 204)
  assert.deepEqual(await seen(), [])
  assert.equal((await post('/announcements', {})).status, 401)
  assert.equal((await call('GET', '/announcements')).body.announcements.length, 1)
})

test('«آخرین ورود» (Amin #5369): set at sign-up', async () => {
  const a = await account()
  const row = (await call('GET', `/users/${a.userId}`)).body
  assert.ok(row.lastLoginAt ?? row.user?.lastLoginAt)
})

test('online (Amin #5454): POST /presence and any signed-in call set lastSeenAt, kept to the minute', async () => {
  const a = await account()
  db.prepare('UPDATE users SET last_seen_at = NULL WHERE id = ?').run(a.userId)
  assert.equal((await post('/presence', { sessionToken: a.sessionToken })).status, 200)
  const first = (await call('GET', `/users/${a.userId}`)).body
  const seenAt = first.lastSeenAt ?? first.user?.lastSeenAt
  assert.ok(seenAt && Date.now() - Date.parse(seenAt) < 5000)
  // a second call within the minute does not write again
  await post('/presence', { sessionToken: a.sessionToken })
  assert.equal(db.prepare('SELECT last_seen_at FROM users WHERE id = ?').get(a.userId).last_seen_at, seenAt)
  assert.equal((await post('/presence', { sessionToken: 'nope' })).status, 401)
  const list = (await call('GET', '/users')).body
  const rows = list.users ?? list.items ?? list
  assert.ok(Array.isArray(rows) && rows.some((r) => 'lastSeenAt' in r))
})
