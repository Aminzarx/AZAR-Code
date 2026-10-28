// KSS (Amin #5659/#5913/#5934): the office dashboard API. Run: node --test test/office.test.js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-office-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.AZAR_OFFICE_SSO_SECRET = 'test-secret-for-office-sso'

let server, base, db
before(async () => {
  const express = require('express')
  db = require('../src/db')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/sync', require('../src/syncRoutes').router)
  app.use(express.json())
  app.use('/auth', require('../src/authRoutes'))
  app.use('/office', require('../src/officeRoutes').router)
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
async function call(method, route, body, headers = {}) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.3.${++requests >> 8}.${requests & 255}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}
const post = (route, body, headers) => call('POST', route, body, headers)

let nextPhone = 100
async function verified() {
  const phoneNumber = `+98912300${String(++nextPhone).padStart(4, '0')}`
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
  return phoneNumber
}
async function account() {
  const phoneNumber = await verified()
  const res = await post('/auth/register', { phoneNumber, referralCode: 'AZARSEED' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return { phoneNumber, ...res.body }
}
async function office(name = 'دفتر املاک پارسه') {
  const owner = await account()
  await post('/auth/send-otp', { phoneNumber: owner.phoneNumber })
  await post('/auth/verify-otp', { phoneNumber: owner.phoneNumber, code: '123456' })
  const res = await post('/office/login', { phoneNumber: owner.phoneNumber, officeName: name })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  return { owner, h: { 'x-office-token': res.body.token } }
}
const sample = { title: 'آپارتمان ۱۲۰ متری ونک', kind: 'فروش', region: 'ونک', address: 'خیابان ملاصدرا، پلاک ۱۲', size: 120, rooms: 2, price: 9500000000, description: 'نوساز', ownerName: 'آقای رضایی', ownerPhone: '09121112233' }

test('signing in to the dashboard keeps the phone signed in', async () => {
  const { owner } = await office()
  const pull = await post('/sync/pull', { sessionToken: owner.sessionToken })
  assert.equal(pull.status, 200)
})

test('an account without an office is asked for its name; a number without an account cannot open one', async () => {
  const a = await account()
  await post('/auth/send-otp', { phoneNumber: a.phoneNumber })
  await post('/auth/verify-otp', { phoneNumber: a.phoneNumber, code: '123456' })
  assert.equal((await post('/office/login', { phoneNumber: a.phoneNumber })).body.error.code, 'no_office')
  const stranger = await verified()
  assert.equal((await post('/office/login', { phoneNumber: stranger, officeName: 'x' })).body.error.code, 'no_account')
  assert.equal((await post('/office/login', { phoneNumber: '+989129999999', officeName: 'x' })).status, 401)
})

test('a new file shows in the overview, counts as new today and can be renewed and archived', async () => {
  const { h } = await office()
  assert.equal((await post('/office/files', { ...sample, kind: 'هر چیزی' }, h)).status, 422)
  const made = await post('/office/files', sample, h)
  assert.equal(made.status, 201)
  const o = (await call('GET', '/office/overview', undefined, h)).body
  assert.equal(o.newToday, 1)
  assert.equal(o.files[0].title, sample.title)
  assert.equal(o.office.rules.address, false)
  assert.equal(o.perDay.length, 14)
  assert.equal((await post(`/office/files/${made.body.id}/renew`, {}, h)).status, 204)
  assert.equal((await post(`/office/files/${made.body.id}/archive`, {}, h)).status, 204)
  assert.equal((await call('GET', '/office/overview', undefined, h)).body.files.length, 0)
})

test('another office cannot see or touch the files', async () => {
  const a = await office()
  const b = await office('دفتر دیگر')
  const made = await post('/office/files', sample, a.h)
  assert.equal((await post(`/office/files/${made.body.id}/archive`, {}, b.h)).status, 404)
  assert.equal((await call('GET', '/office/overview', undefined, b.h)).body.files.length, 0)
  assert.equal((await call('GET', '/office/overview')).status, 401)
})

test('an adviser joins with code + word once, sees only what was sent, only the allowed fields', async () => {
  const { h } = await office()
  const adviser = await account()
  const app = { sessionToken: adviser.sessionToken }
  const code = (await post('/office/codes', {}, h)).body
  assert.match(code.code, /^\d{8}$/)
  assert.equal((await post('/office/adviser/join', { ...app, code: code.code, word: 'غلط' })).status, 422)
  assert.equal((await post('/office/adviser/join', { ...app, code: code.code, word: code.word })).status, 200)
  assert.equal((await post('/office/adviser/join', { ...app, code: code.code, word: code.word })).status, 422) // one-time

  const one = (await post('/office/files', sample, h)).body.id
  await post('/office/files', { ...sample, title: 'مغازه' }, h)
  assert.equal((await post('/office/adviser/files', app)).body.files.length, 0)

  assert.equal((await post('/office/share', { fileIds: [one], to: 'all', fields: { description: true } }, h)).status, 200)
  const seen = (await post('/office/adviser/files', app)).body
  assert.equal(seen.files.length, 1)
  assert.equal(seen.files[0].description, 'نوساز')
  assert.equal(seen.files[0].address, null)
  assert.equal(seen.files[0].ownerPhone, null)

  const o = (await call('GET', '/office/overview', undefined, h)).body
  assert.equal(o.advisers.length, 1)
  assert.equal(o.sentFiles, 1)

  // unlinking stops the adviser seeing anything at once
  assert.equal((await post(`/office/advisers/${adviser.userId}/unlink`, {}, h)).status, 204)
  assert.equal((await post('/office/adviser/files', app)).body.office, null)
})

test('a revoked or expired code does not join', async () => {
  const { h } = await office()
  const adviser = await account()
  const code = (await post('/office/codes', {}, h)).body
  await post(`/office/codes/${code.code}/revoke`, {}, h)
  assert.equal((await post('/office/adviser/join', { sessionToken: adviser.sessionToken, code: code.code, word: code.word })).status, 422)
})

// Amin #5967: opening the dashboard from the panel at kssx.ir/app (no second code)
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function handoff(phone, { secret = 'test-secret-for-office-sso', age = 0, nonce = crypto.randomBytes(16).toString('hex') } = {}) {
  const iat = Math.floor(Date.now() / 1000) - age
  const part = b64u(JSON.stringify({ v: 1, phone, iat, exp: iat + 60, nonce }))
  return part + '.' + b64u(crypto.createHmac('sha256', secret).update(part).digest())
}
const local = (intl) => '0' + intl.slice(3)

test('a signed handoff from the panel opens the office once; a new account names its office first', async () => {
  const { owner, h } = await office('دفتر نمونه')
  const ok = await post('/office/sso', { h: handoff(local(owner.phoneNumber)) })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  assert.equal((await call('GET', '/office/overview', undefined, { 'x-office-token': ok.body.token })).body.office.name, 'دفتر نمونه')
  assert.ok(h)

  const once = handoff(local(owner.phoneNumber))
  assert.equal((await post('/office/sso', { h: once })).status, 200)
  assert.equal((await post('/office/sso', { h: once })).status, 401) // reused

  const fresh = await account()
  const first = await post('/office/sso', { h: handoff(local(fresh.phoneNumber)) })
  assert.equal(first.status, 404)
  assert.equal(first.body.error.code, 'no_office')
  const opened = await post('/office/sso/open', { ticket: first.body.ticket, officeName: 'دفتر تازه' })
  assert.equal(opened.status, 200)
  assert.equal(opened.body.office.name, 'دفتر تازه')
  assert.equal((await post('/office/sso/open', { ticket: first.body.ticket, officeName: 'x' })).status, 401)
})

test('a wrong signature, an old handoff or a number without EYVAN does not open', async () => {
  const { owner } = await office()
  assert.equal((await post('/office/sso', { h: handoff(local(owner.phoneNumber), { secret: 'other' }) })).status, 401)
  assert.equal((await post('/office/sso', { h: handoff(local(owner.phoneNumber), { age: 200 }) })).status, 401)
  assert.equal((await post('/office/sso', { h: 'garbage' })).status, 401)
  assert.equal((await post('/office/sso', { h: handoff('09121110000') })).body.error.code, 'no_account')
})
