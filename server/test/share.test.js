// KSS (Amin #6339/#6341/#6523): protected file sharing. Run: node --test test/share.test.js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-share-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')

let server, base, db, share
let clock = Date.parse('2026-10-31T10:00:00.000Z')
before(async () => {
  const express = require('express')
  db = require('../src/db')
  share = require('../src/shareRoutes')
  share.setClock(() => clock)
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/share', share.router)
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r)
  })
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.close()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

let requests = 0
async function post(route, body) {
  const res = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${++requests >> 8}.${requests & 255}` },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

let n = 0
/** a signed-in account (users + sessions rows, as /auth/register leaves them) */
function account() {
  const id = `user-${++n}`
  db.prepare('INSERT INTO users (id, phone_number, referral_code, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    `0912555${String(n).padStart(4, '0')}`,
    `REF${n}`,
    new Date().toISOString()
  )
  const sessionToken = crypto.randomBytes(16).toString('hex')
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(sessionToken, id, new Date().toISOString())
  return { id, sessionToken }
}

const FILE = {
  title: 'آپارتمان ۱۲۰ متری',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  region: 'ونک',
  price: 12000000000,
  area: 120,
  rooms: 3,
  isConvertible: false,
  barterItems: [],
  owner: { name: 'مشاور فرستنده', phone: '+989125550001', isSender: true },
  photos: [{ data: Buffer.from('webp-bytes').toString('base64'), bytes: 10, width: 4, height: 3 }]
}

test('create → receive: the receiver gets exactly the snapshot; the link is eyvan:// and lasts one hour', async () => {
  const a = account()
  const b = account()
  const made = await post('/share/create', { sessionToken: a.sessionToken, file: FILE })
  assert.equal(made.status, 201, JSON.stringify(made.body))
  assert.match(made.body.code, /^[A-Za-z0-9_-]{24}$/)
  assert.equal(made.body.link, `eyvan://share?c=${made.body.code}`)
  assert.equal(Date.parse(made.body.expiresAt) - clock, 60 * 60 * 1000)
  const got = await post('/share/receive', { sessionToken: b.sessionToken, code: made.body.code })
  assert.equal(got.status, 200, JSON.stringify(got.body))
  assert.deepEqual(got.body.file, { v: 1, ...FILE })
  assert.equal(got.body.sharedAt, new Date(clock).toISOString())
})

test('single use: a second receive (anyone) gets 410 with a Persian sentence; the snapshot is wiped', async () => {
  const a = account()
  const b = account()
  const c = account()
  const { body } = await post('/share/create', { sessionToken: a.sessionToken, file: FILE })
  assert.equal((await post('/share/receive', { sessionToken: b.sessionToken, code: body.code })).status, 200)
  for (const who of [b, c]) {
    const again = await post('/share/receive', { sessionToken: who.sessionToken, code: body.code })
    assert.equal(again.status, 410)
    assert.equal(again.body.error.code, 'share_used')
    assert.match(again.body.error.message, /یک‌بار/)
  }
  const row = db.prepare('SELECT data, used_at, receiver_id FROM share_links WHERE code_hash = ?').get(crypto.createHash('sha256').update(body.code).digest('hex'))
  assert.equal(row.data, null)
  assert.equal(row.receiver_id, b.id)
  assert.ok(row.used_at)
})

test('one hour: at 59 minutes it works, after 60 it is expired (410) and its contents are wiped', async () => {
  const a = account()
  const b = account()
  const start = clock
  const early = (await post('/share/create', { sessionToken: a.sessionToken, file: FILE })).body
  const late = (await post('/share/create', { sessionToken: a.sessionToken, file: FILE })).body
  clock = start + 59 * 60 * 1000
  assert.equal((await post('/share/receive', { sessionToken: b.sessionToken, code: early.code })).status, 200)
  clock = start + 60 * 60 * 1000
  const expired = await post('/share/receive', { sessionToken: b.sessionToken, code: late.code })
  assert.equal(expired.status, 410)
  assert.equal(expired.body.error.code, 'share_expired')
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM share_links WHERE data IS NOT NULL AND expires_at <= ?').get(new Date(clock).toISOString()).n, 0)
  // a day later the row itself is forgotten: the code is then unknown
  clock = start + 26 * 60 * 60 * 1000
  share.cleanUp()
  assert.equal((await post('/share/receive', { sessionToken: b.sessionToken, code: late.code })).status, 404)
})

test('the sender cannot receive their own link (409), and that try does not use it up', async () => {
  const a = account()
  const b = account()
  const { body } = await post('/share/create', { sessionToken: a.sessionToken, file: FILE })
  const own = await post('/share/receive', { sessionToken: a.sessionToken, code: body.code })
  assert.equal(own.status, 409)
  assert.equal(own.body.error.code, 'share_own')
  assert.equal((await post('/share/receive', { sessionToken: b.sessionToken, code: body.code })).status, 200)
})

test('signed in only; unknown or malformed codes are 404', async () => {
  const a = account()
  assert.equal((await post('/share/create', { file: FILE })).status, 401)
  assert.equal((await post('/share/create', { sessionToken: 'nope', file: FILE })).status, 401)
  assert.equal((await post('/share/receive', { code: 'x'.repeat(24) })).status, 401)
  const unknown = await post('/share/receive', { sessionToken: a.sessionToken, code: crypto.randomBytes(18).toString('base64url') })
  assert.equal(unknown.status, 404)
  assert.equal(unknown.body.error.code, 'share_not_found')
  assert.equal((await post('/share/receive', { sessionToken: a.sessionToken, code: '../etc' })).status, 404)
})

test('nothing extra is stored: unknown fields are dropped, the code itself is never kept, the row is sealed', async () => {
  const a = account()
  const b = account()
  const sent = { ...FILE, photos: undefined, owner: undefined, address: undefined, secret: 'x', ownerId: 'leak', id: 'p1' }
  const { body } = await post('/share/create', { sessionToken: a.sessionToken, file: sent })
  const row = db.prepare('SELECT * FROM share_links WHERE sender_id = ?').get(a.id)
  assert.deepEqual(Object.keys(row).sort(), ['code_hash', 'created_at', 'data', 'expires_at', 'receiver_id', 'sender_id', 'used_at'])
  assert.notEqual(row.code_hash, body.code)
  assert.equal(JSON.stringify(row).includes(body.code), false)
  assert.equal(Buffer.from(row.data).toString('utf8').includes('آپارتمان'), false, 'sealed at rest')
  const got = await post('/share/receive', { sessionToken: b.sessionToken, code: body.code })
  assert.deepEqual(Object.keys(got.body.file).sort(), ['area', 'barterItems', 'city', 'isConvertible', 'price', 'propertyType', 'region', 'rooms', 'title', 'transactionType', 'v'])
  assert.equal(got.body.file.owner, undefined)
  assert.equal(got.body.file.photos, undefined)
})

test('a malformed file is refused (422): no title, a bad phone, too many photos', async () => {
  const a = account()
  for (const file of [
    { ...FILE, title: '' },
    { ...FILE, owner: { name: 'x', phone: 'call me' } },
    { ...FILE, photos: Array.from({ length: 11 }, () => FILE.photos[0]) },
    'not a file'
  ]) {
    const res = await post('/share/create', { sessionToken: a.sessionToken, file })
    assert.equal(res.status, 422)
    assert.equal(res.body.error.code, 'invalid_file')
  }
})
