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
let nextName = 0
/** the dashboard's own sign-in, chosen on the request (Amin #6034) */
const login = () => ({ username: `office_${++nextName}`, password: 'parse-1234' })
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
/** an approved office-panel request (Amin #5970), as sales management would approve it */
async function approved(owner) {
  assert.equal((await post('/office/adviser/request', { sessionToken: owner.sessionToken, address: 'تهران، ونک', ...(owner.login || login()) })).status, 201)
  const id = require('../src/officeRoutes').listRequests('pending').find((r) => r.userId === owner.userId).id
  assert.equal(require('../src/officeRoutes').approveRequest(id, 'test').ok, true)
}
async function office(name = 'دفتر املاک پارسه') {
  const owner = await account()
  await approved(owner)
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
  assert.equal((await post('/office/login', { phoneNumber: a.phoneNumber })).body.error.code, 'not_approved')
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
  assert.equal((await call('GET', '/office/overview', undefined, { 'x-office-token': ok.body.token })).body.office.name, 'دفتر املاک')
  assert.ok(h)

  const once = handoff(local(owner.phoneNumber))
  assert.equal((await post('/office/sso', { h: once })).status, 200)
  assert.equal((await post('/office/sso', { h: once })).status, 401) // reused

  const fresh = await account()
  assert.equal((await post('/office/sso', { h: handoff(local(fresh.phoneNumber)) })).body.error.code, 'not_approved')
  await approved(fresh)
  assert.equal((await post('/office/sso', { h: handoff(local(fresh.phoneNumber)) })).status, 200)
})

test('a wrong signature, an old handoff or a number without EYVAN does not open', async () => {
  const { owner } = await office()
  assert.equal((await post('/office/sso', { h: handoff(local(owner.phoneNumber), { secret: 'other' }) })).status, 401)
  assert.equal((await post('/office/sso', { h: handoff(local(owner.phoneNumber), { age: 200 }) })).status, 401)
  assert.equal((await post('/office/sso', { h: 'garbage' })).status, 401)
  assert.equal((await post('/office/sso', { h: handoff('09121110000') })).body.error.code, 'no_account')
})

test('the office-panel request: send, cancel (never approvable), send again, approve copies the account files', async () => {
  const user = await account()
  const app = { sessionToken: user.sessionToken, ...login() }
  const routes = require('../src/officeRoutes')
  assert.equal((await post('/office/adviser/request', { ...app, address: '' })).status, 422)
  assert.equal((await post('/office/adviser/request', { ...app, address: 'ونک', landline: '123' })).status, 422)
  const sent = await post('/office/adviser/request', { ...app, address: 'تهران، ونک، پلاک ۱', unionLicence: true, landline: '۰۲۱۸۸۷۷۶۶۵۵' })
  assert.equal(sent.status, 201)
  assert.equal(sent.body.request.landline, '02188776655')
  assert.equal((await post('/office/adviser/request', { ...app, address: 'x' })).status, 409) // one at a time
  const firstId = sent.body.request.id
  assert.equal((await post('/office/adviser/request/cancel', app)).body.request.status, 'cancelled')
  assert.equal(routes.approveRequest(firstId, 't').error, 'cancelled')
  assert.equal(routes.listRequests('cancelled').some((r) => r.id === firstId), true)

  // the account's own files on the server come along when approved
  const now = new Date().toISOString()
  await post('/sync/push', { sessionToken: user.sessionToken, changes: [
    { t: 'properties', k: 'p1', row: { id: 'p1', title: 'آپارتمان ۸۰ متری', transaction_type: 'rent', city: 'تهران', region: 'ونک', area: 80, deposit_amount: 5e8, status: 'active', created_at: now, updated_at: now } },
    { t: 'properties', k: 'p2', row: { id: 'p2', title: 'بایگانی', status: 'archived', created_at: now, updated_at: now } }
  ] })
  const again = await post('/office/adviser/request', { ...app, address: 'تهران، ونک' })
  assert.equal(again.status, 201)
  const out = routes.approveRequest(again.body.request.id, 't')
  assert.equal(out.imported, 1)
  assert.equal((await post('/office/adviser/request/status', app)).body.portal, true)
  assert.equal(routes.officeActivity().find((o) => o.userId === user.userId).files, 1)
  // the phone's copy is untouched
  assert.equal((await post('/sync/pull', app)).body.rows.filter((r) => r.t === 'properties').length, 2)
})

test('the dashboard password (Amin #6034): chosen on the request, unique, hashed; wrong tries lock the name', async () => {
  const owner = await account()
  const app = { sessionToken: owner.sessionToken, address: 'ونک' }
  assert.equal((await post('/office/adviser/request', { ...app, username: 'ab', password: 'parse-1234' })).body.error.code, 'invalid_username')
  assert.equal((await post('/office/adviser/request', { ...app, username: 'parse_office', password: 'short' })).body.error.code, 'weak_password')
  owner.login = { username: 'Parse_Office', password: 'parse-1234' }
  await approved(owner)
  const row = db.prepare('SELECT username, password_hash FROM office_requests WHERE user_id = ?').get(owner.userId)
  assert.equal(row.username, 'parse_office')
  assert.equal(row.password_hash.includes('parse-1234'), false)
  const other = await account()
  assert.equal((await post('/office/adviser/request', { sessionToken: other.sessionToken, address: 'x', username: 'parse_office', password: 'parse-1234' })).body.error.code, 'username_taken')

  const opened = await post('/office/password', { username: 'parse_office', password: 'parse-1234' })
  assert.equal(opened.status, 200) // approving already opened the office
  assert.equal((await call('GET', '/office/overview', undefined, { 'x-office-token': opened.body.token })).status, 200)
  assert.equal((await post('/office/password', { username: 'PARSE_OFFICE', password: 'parse-1234' })).status, 200)

  for (let i = 0; i < 5; i++) assert.equal((await post('/office/password', { username: 'parse_office', password: 'wrong-pass' })).body.error.code, 'wrong_login')
  assert.equal((await post('/office/password', { username: 'parse_office', password: 'parse-1234' })).body.error.code, 'login_locked')
  assert.equal((await post('/office/password', { username: 'nobody_here', password: 'parse-1234' })).body.error.code, 'wrong_login')
})

test('«ورود با ایوان» (Amin #6033): the app confirms the code once; the dashboard gets the session; old codes die', async () => {
  const { owner } = await office()
  const start = await post('/office/link/start', {})
  assert.equal(start.status, 201)
  assert.match(start.body.code, /^\d{8}$/)
  assert.deepEqual((await post('/office/link/poll', { poll: start.body.poll })).body, { pending: true })
  const stranger = await account() // not approved
  assert.equal((await post('/office/adviser/link/confirm', { sessionToken: stranger.sessionToken, code: start.body.code })).body.error.code, 'not_approved')
  const ok = await post('/office/adviser/link/confirm', { sessionToken: owner.sessionToken, code: `eyvan://office-link?c=${start.body.code}` })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  assert.equal((await post('/office/adviser/link/confirm', { sessionToken: owner.sessionToken, code: start.body.code })).status, 410) // once
  const got = await post('/office/link/poll', { poll: start.body.poll })
  assert.equal(got.status, 200)
  assert.equal((await call('GET', '/office/overview', undefined, { 'x-office-token': got.body.token })).status, 200)
  assert.equal((await post('/office/link/poll', { poll: start.body.poll })).status, 410) // the ticket works once
  const old = await post('/office/link/start', {})
  db.prepare('UPDATE office_links SET expires_at = ? WHERE code = ?').run(new Date(Date.now() - 1000).toISOString(), old.body.code)
  assert.equal((await post('/office/adviser/link/confirm', { sessionToken: owner.sessionToken, code: old.body.code })).status, 410)
  assert.equal((await post('/office/link/poll', { poll: old.body.poll })).status, 410)
})
