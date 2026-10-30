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
process.env.KSS_PRICING_KEY = 'reader-key'
process.env.AZAR_TEST_OTP_NUMBERS = '09123009999' // a KSS demo number (#6345)
const ADMIN_KEY = crypto.randomBytes(32).toString('hex')
process.env.AZAR_ADMIN_KEY = ADMIN_KEY

let server, base, db, pricing
before(async () => {
  // Amin #6269: files cost the office tokens at pricing's tokens per KB
  const http = require('node:http')
  pricing = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ apps: [
      { key: 'eyvan_token_allowance', value: 100, price_toman: null },
      { key: 'eyvan_tokens_per_kb', value: 0.5, price_toman: null },
      { key: 'eyvan_token_price', value: 50, price_toman: 50, vat_applies: false, vat_included: null, vat_rate: null },
      { key: 'eyvan_token_min_buy', value: 1200, price_toman: null }
    ] }))
  })
  await new Promise((r) => pricing.listen(0, '127.0.0.1', r))
  process.env.KSS_PRICING_URL = `http://127.0.0.1:${pricing.address().port}`
  const express = require('express')
  db = require('../src/db')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/sync', require('../src/syncRoutes').router)
  app.use(express.json())
  app.use('/auth', require('../src/authRoutes'))
  app.use('/office', require('../src/officeRoutes').router)
  app.use('/admin', require('../src/adminRoutes').router)
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r)
  })
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  pricing.close()
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
/** tokens given to an office (as a KSS admin would); a negative amount takes some back */
function grant(officeId, amount) {
  require('../src/tokens').post(`office:${officeId}`, amount >= 0 ? 'admin_grant' : 'admin_deduct', amount, `test:${crypto.randomUUID()}`)
}
async function office(name = 'دفتر املاک پارسه', startTokens = 100000) {
  const owner = await account()
  await approved(owner)
  await post('/auth/send-otp', { phoneNumber: owner.phoneNumber })
  await post('/auth/verify-otp', { phoneNumber: owner.phoneNumber, code: '123456' })
  const res = await post('/office/login', { phoneNumber: owner.phoneNumber, officeName: name })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  const officeId = db.prepare('SELECT id FROM offices WHERE owner_user_id = ?').get(owner.userId).id
  if (startTokens !== 2500) grant(officeId, startTokens - 2500) // every office starts with 2,500 (#6289)
  return { owner, h: { 'x-office-token': res.body.token }, officeId }
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
  // Amin #6090/#6091: case, spaces, invisible marks and full-width letters don't make a new name
  for (const same of ['PARSE_OFFICE', ' Parse_Office ', 'parse‌_office', 'ｐａｒｓｅ_office']) {
    assert.equal((await post('/office/adviser/request', { sessionToken: other.sessionToken, address: 'x', username: same, password: 'parse-1234' })).body.error.code, 'username_taken', same)
  }
  // and the database refuses a second live row by itself
  assert.throws(() => db.prepare("INSERT INTO office_requests (id, user_id, address, status, created_at, username) VALUES ('dup', ?, 'x', 'pending', 'now', 'parse_office')").run(other.userId), /UNIQUE/)

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

test('turning the panel off (sales management) gives the app back, signs dashboards out, and a new request can follow', async () => {
  const { owner, h } = await office()
  const routes = require('../src/officeRoutes')
  const id = routes.listRequests('approved').find((r) => r.userId === owner.userId).id
  assert.equal(routes.endPortal(id, 't').ok, true)
  assert.equal(routes.endPortal(id, 't').error, 'not_on')
  const status = (await post('/office/adviser/request/status', { sessionToken: owner.sessionToken })).body
  assert.equal(status.portal, false)
  assert.ok(status.request.endedAt)
  assert.equal((await call('GET', '/office/overview', undefined, h)).status, 401)
  assert.equal((await post('/sync/pull', { sessionToken: owner.sessionToken })).status, 200)
  const again = await post('/office/adviser/request', { sessionToken: owner.sessionToken, address: 'ونک', ...login() })
  assert.equal(again.status, 201)
})

test('one username in the whole system (Amin #6090): the names billing holds (kssx.ir, sales management, IRIS) count; no answer = refused', async () => {
  const http = require('node:http')
  let answer = { taken: true }
  const billing = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      seen.push({ auth: req.headers.authorization, url: req.url, body: JSON.parse(body) })
      res.writeHead(answer ? 200 : 500, { 'content-type': 'application/json' }).end(JSON.stringify(answer ?? {}))
    })
  })
  const seen = []
  await new Promise((r) => billing.listen(0, '127.0.0.1', r))
  process.env.AZAR_BILLING_URL = `http://127.0.0.1:${billing.address().port}/api/v1`
  process.env.AZAR_BILLING_KEY = 'k'.repeat(40)
  try {
    const owner = await account()
    const ask = (username) => post('/office/adviser/request', { sessionToken: owner.sessionToken, address: 'x', username, password: 'parse-1234' })
    const taken = await ask('Zarandix')
    assert.equal(taken.status, 409)
    assert.equal(taken.body.error.code, 'username_taken')
    assert.deepEqual(seen[0], { auth: `Bearer ${'k'.repeat(40)}`, url: '/api/v1/internal/username-taken', body: { username: 'zarandix' } })
    answer = null
    assert.equal((await ask('zarandix2')).body.error.code, 'username_check_failed')
    answer = { taken: false }
    assert.equal((await ask('zarandix2')).status, 201)
    // billing's side asks here before it hands out a name
    const routes = require('../src/officeRoutes')
    assert.equal(routes.usernameTaken(routes.usernameOf(' ZARANDIX2 ')), true)
    assert.equal(routes.usernameTaken(routes.usernameOf('zarandix3')), false)
  } finally {
    delete process.env.AZAR_BILLING_URL
    delete process.env.AZAR_BILLING_KEY
    billing.close()
  }
})

// ---------------------------------------------------------------- Amin #6269: the office pays in tokens ----
test('Amin #6269: adding a file takes its tokens once; sending takes them per new recipient (× 4 advisers); short = refused with the buy link; advisers pay nothing', async () => {
  const { owner, h, officeId } = await office('دفتر توکن', 0)
  // no tokens: adding is refused, nothing is stored
  const none = await post('/office/files', sample, h)
  assert.equal(none.status, 402)
  assert.equal(none.body.error.code, 'tokens_short')
  assert.match(none.body.error.message, /توکن/)
  assert.equal(none.body.buy, '#tokens')
  assert.equal((await call('GET', '/office/overview', undefined, h)).body.files.length, 0)

  grant(officeId, 5000)
  const made = await post('/office/files', sample, h)
  assert.equal(made.status, 201, JSON.stringify(made.body))
  const cost = made.body.tokens
  assert.ok(Number.isInteger(cost) && cost >= 1)
  assert.equal(made.body.balance, 5000 - cost)
  const o = (await call('GET', '/office/overview', undefined, h)).body
  assert.equal(o.tokens.balance, 5000 - cost)
  assert.equal(o.files[0].tokens, cost, 'the overview shows what one recipient costs')
  // renewing is free (the holding cost is charged once, #6274 a)
  assert.equal((await post(`/office/files/${made.body.id}/renew`, {}, h)).status, 204)
  assert.equal(require('../src/officeRoutes').officeBalance(officeId), 5000 - cost)

  // four advisers join; their own tokens never move
  const advisers = []
  for (let i = 0; i < 4; i++) {
    const a = await account()
    const code = (await post('/office/codes', {}, h)).body
    assert.equal((await post('/office/adviser/join', { sessionToken: a.sessionToken, code: code.code, word: code.word })).status, 200)
    advisers.push(a)
  }
  const ledgerOf = (id) => db.prepare('SELECT COUNT(*) AS n FROM token_ledger WHERE account_id = ?').get(id).n
  const before = advisers.map((a) => ledgerOf(a.userId))
  const sent = await post('/office/share', { fileIds: [made.body.id], to: 'all', fields: {} }, h)
  assert.equal(sent.status, 200, JSON.stringify(sent.body))
  assert.equal(sent.body.tokens, cost * 4)
  assert.equal(sent.body.balance, 5000 - cost * 5)
  assert.deepEqual(advisers.map((a) => ledgerOf(a.userId)), before, 'the advisers pay nothing')
  // the same people again: no new charge
  assert.equal((await post('/office/share', { fileIds: [made.body.id], to: 'all', fields: { description: true } }, h)).body.tokens, 0)
  for (const a of advisers) assert.equal((await post('/office/adviser/files', { sessionToken: a.sessionToken })).body.files.length, 1)

  // a send the office cannot pay for is refused, and nobody gets the file
  const second = (await post('/office/files', { ...sample, title: 'مغازه' }, h)).body
  grant(officeId, -(require('../src/officeRoutes').officeBalance(officeId) - (second.tokens * 4 - 1)))
  const short = await post('/office/share', { fileIds: [second.id], to: 'all', fields: {} }, h)
  assert.equal(short.status, 402)
  assert.equal(short.body.needed, second.tokens * 4)
  assert.equal((await post('/office/adviser/files', { sessionToken: advisers[0].sessionToken })).body.files.length, 1)

  // the usage page: every line, newest first, in words
  const t = (await call('GET', '/office/tokens', undefined, h)).body
  assert.equal(t.balance, second.tokens * 4 - 1)
  assert.ok(t.lines.some((l) => l.kind === 'office_file_share' && l.amount === -cost * 4 && /برای ۴ مشاور/.test(l.what)))
  assert.ok(t.lines.some((l) => l.kind === 'office_file_hold' && /افزودن فایل/.test(l.what)))
  assert.equal(typeof t.buy.open, 'boolean')
  void owner
})

test('Amin #6269: another office never sees or spends these tokens', async () => {
  const a = await office('دفتر الف', 1000)
  const b = await office('دفتر ب', 0)
  assert.equal((await call('GET', '/office/tokens', undefined, b.h)).body.balance, 0)
  assert.equal((await call('GET', '/office/tokens', undefined, a.h)).body.balance, 1000)
  assert.equal((await post('/office/tokens/status', { orderId: 'tko_x' }, b.h)).status, 404)
})

// ---------------------------------------------------------------- Amin #6289: 2,500 to start; sales management tools ----
// sales management calls from the same machine (the admin guard refuses a forwarded request)
async function admin(method, route, body, key) {
  const res = await fetch(`${base}/admin${route}`, { method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_KEY}`, 'x-admin-actor': 'test-admin', ...(key ? { 'idempotency-key': key } : {}) } })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

test('Amin #6289: a new office starts with 2,500 tokens, one ledger line, given once', async () => {
  const { h, officeId } = await office('دفتر شروع', 2500)
  const t = (await call('GET', '/office/tokens', undefined, h)).body
  assert.equal(t.balance, 2500)
  assert.deepEqual(t.lines.map((l) => [l.kind, l.amount, l.what]), [['office_default', 2500, 'توکن هدیهٔ شروع دفتر']])
  const o = require('../src/officeRoutes')
  assert.equal(o.giveDefault(officeId), false, 'a second time gives nothing')
  assert.deepEqual(o.giveMissingDefaults(), [])
  assert.equal(o.officeBalance(officeId), 2500)
})

test('Amin #6289: an office made before the default gets it once at start-up (listed first in a dry run)', async () => {
  const { officeId } = await office('دفتر قدیمی', 2500)
  db.prepare("DELETE FROM token_ledger WHERE idem_key = ?").run(`office-default:${officeId}`) // as if made before #6289
  const o = require('../src/officeRoutes')
  const dry = o.giveMissingDefaults(true)
  assert.deepEqual(dry.map((x) => [x.officeId, x.balance, x.gets]), [[officeId, 0, 2500]])
  assert.equal(o.officeBalance(officeId), 0, 'a dry run gives nothing')
  assert.equal(o.giveMissingDefaults().length, 1)
  assert.equal(o.officeBalance(officeId), 2500)
  assert.equal(o.giveMissingDefaults().length, 0)
})

test('Amin #6289: sales management adds and deducts an office\'s tokens like an app user\'s (reason, ledger, never below 0, once per key)', async () => {
  const { owner, h, officeId } = await office('دفتر مدیریت', 2500)
  const appLines = () => db.prepare('SELECT COUNT(*) n FROM token_ledger WHERE account_id = ?').get(owner.userId).n
  const appBefore = appLines()
  const actRes = await admin('GET', '/office-activity')
  assert.equal(actRes.status, 200, JSON.stringify(actRes.body))
  const act = actRes.body.offices.find((x) => x.officeId === officeId)
  assert.equal(act.tokens.balance, 2500)
  const g = await admin('POST', `/offices/${officeId}/tokens/grant`, { amount: 500, note: 'هدیهٔ همکاری' }, 'k-grant-1')
  assert.equal(g.status, 200, JSON.stringify(g.body))
  assert.equal(g.body.tokens.balance, 3000)
  assert.equal((await admin('POST', `/offices/${officeId}/tokens/grant`, { amount: 500, note: 'هدیهٔ همکاری' }, 'k-grant-1')).body.tokens.balance, 3000, 'same key = once')
  assert.equal((await admin('POST', `/offices/${officeId}/tokens/deduct`, { amount: 10 }, 'k-d0')).status, 422, 'a deduct needs a reason')
  const short = await admin('POST', `/offices/${officeId}/tokens/deduct`, { amount: 3001, reason: 'اشتباه' }, 'k-d1')
  assert.equal(short.status, 409)
  assert.equal(short.body.balance, 3000)
  assert.equal((await admin('POST', `/offices/${officeId}/tokens/deduct`, { amount: 200, reason: 'توکن اشتباهی' }, 'k-d2')).body.tokens.balance, 2800)
  const led = (await admin('GET', `/offices/${officeId}/tokens`)).body
  assert.equal(led.balance, 2800)
  assert.deepEqual(led.lines.map((l) => [l.reason, l.amount]).sort(), [['admin_deduct', -200], ['admin_grant', 500], ['office_default', 2500]].sort())
  assert.ok(led.lines.some((l) => l.reason === 'admin_deduct' && l.ref === 'توکن اشتباهی'))
  // the dashboard shows the same lines in words; the manager's own app tokens never move
  const t = (await call('GET', '/office/tokens', undefined, h)).body
  assert.ok(t.lines.some((l) => l.what === 'هدیهٔ KSS' && l.amount === 500))
  assert.equal(appLines(), appBefore)
  assert.equal((await admin('GET', '/offices/nope/tokens')).status, 404)
})

/** an adviser linked to the office by a code */
async function linkedAdviser(h) {
  const adviser = await account()
  const code = (await post('/office/codes', {}, h)).body
  assert.equal((await post('/office/adviser/join', { sessionToken: adviser.sessionToken, code: code.code, word: code.word })).status, 200)
  return adviser
}

test('Amin #6343: the office takes its request back — files go home to the app, shares end, advisers unlinked, signed out', async () => {
  const owner = await account()
  const at = new Date().toISOString()
  await post('/sync/push', { sessionToken: owner.sessionToken, changes: [
    { t: 'properties', k: 'own1', row: { id: 'own1', owner_id: owner.userId, title: 'فایل خود گوشی', city: 'تهران', address: '', status: 'active', created_at: at, updated_at: at } }
  ] })
  await approved(owner)
  const { username } = db.prepare('SELECT username FROM office_requests WHERE user_id = ?').get(owner.userId)
  const opened = await post('/office/password', { username, password: 'parse-1234' })
  assert.equal(opened.status, 200, JSON.stringify(opened.body))
  const h = { 'x-office-token': opened.body.token }
  const made = (await post('/office/files', sample, h)).body.id
  const adviser = await linkedAdviser(h)
  await post('/office/share', { fileIds: [made], to: 'all' }, h)
  const code = (await post('/office/codes', {}, h)).body
  assert.equal((await post('/office/adviser/files', { sessionToken: adviser.sessionToken })).body.files.length, 1)

  assert.equal((await post('/office/withdraw', {}, h)).body.error.code, 'confirm_required')
  const out = await post('/office/withdraw', { confirm: 'withdraw' }, h)
  assert.equal(out.status, 200, JSON.stringify(out.body))
  assert.deepEqual(out.body, { returned: 1, files: 2 }) // the imported one is still on the phone
  assert.equal((await call('GET', '/office/overview', undefined, h)).status, 401)
  assert.equal((await post('/office/adviser/files', { sessionToken: adviser.sessionToken })).body.office, null)
  assert.equal((await post('/office/adviser/join', { sessionToken: (await account()).sessionToken, code: code.code, word: code.word })).status, 422)
  assert.equal((await post('/office/adviser/request/status', { sessionToken: owner.sessionToken })).body.portal, false)
  const props = (await post('/sync/pull', { sessionToken: owner.sessionToken })).body.rows.filter((r) => r.t === 'properties')
  assert.equal(props.length, 2)
  const home = props.find((r) => r.k === `office-${made}`).row
  assert.equal(home.owner_id, owner.userId)
  assert.equal(home.title, sample.title)
  assert.equal(home.transaction_type, 'sale')
  assert.equal(home.area, 120)
  assert.match(home.description, /مالک: آقای رضایی، 09121112233/)
  // a new request can follow
  assert.equal((await post('/office/adviser/request', { sessionToken: owner.sessionToken, address: 'ونک', ...login() })).status, 201)
})

test('Amin #6344: a share runs until a date or with no end; the office cancels either; an ended share is gone', async () => {
  const { h } = await office()
  const a = await linkedAdviser(h)
  const b = await linkedAdviser(h)
  const file = (await post('/office/files', sample, h)).body.id
  const seen = async (who) => (await post('/office/adviser/files', { sessionToken: who.sessionToken })).body.files.length
  assert.equal((await post('/office/share', { fileIds: [file], to: 'all', until: '2000-01-01' }, h)).body.error.code, 'invalid_until')
  const tomorrow = new Date(Date.now() + 86400000).toISOString()
  assert.equal((await post('/office/share', { fileIds: [file], to: [a.userId], until: tomorrow }, h)).status, 200)
  assert.equal((await post('/office/share', { fileIds: [file], to: [b.userId], until: null }, h)).status, 200)
  const shares = (await call('GET', '/office/overview', undefined, h)).body.files[0].shares
  assert.equal(shares.find((s) => s.adviserId === a.userId).until, tomorrow)
  assert.equal(shares.find((s) => s.adviserId === b.userId).until, null)
  assert.equal(await seen(a), 1)
  // the date passes: a no longer sees it, and sending again is a new (paid) recipient
  db.prepare('UPDATE office_shares SET expires_at = ? WHERE adviser_id = ?').run(new Date(Date.now() - 1000).toISOString(), a.userId)
  assert.equal(await seen(a), 0)
  const resend = await post('/office/share', { fileIds: [file], to: [a.userId] }, h)
  assert.ok(resend.body.tokens > 0)
  assert.equal(await seen(a), 1)
  // cancel one recipient, then all
  assert.equal((await post('/office/share/cancel', { fileId: file, adviserId: b.userId }, h)).body.cancelled, 1)
  assert.equal(await seen(b), 0)
  assert.equal(await seen(a), 1)
  assert.equal((await post('/office/share/cancel', { fileId: file }, h)).body.cancelled, 1)
  assert.equal(await seen(a), 0)
  const other = await office('دفتر دیگر')
  assert.equal((await post('/office/share/cancel', { fileId: file }, other.h)).status, 404)
})

test('Amin #6346: sign in with the mobile number — the app sees it at once, confirms or refuses; same answer for any number', async () => {
  const { owner } = await office()
  const app = { sessionToken: owner.sessionToken }
  assert.equal((await post('/office/link/phone', { phone: '123' })).status, 422)
  const nobody = await post('/office/link/phone', { phone: '09359990000' })
  assert.equal(nobody.status, 201) // looks the same: the page never says who has an office
  assert.deepEqual((await post('/office/link/poll', { poll: nobody.body.poll })).body, { pending: true })

  const persian = local(owner.phoneNumber).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)))
  const first = await post('/office/link/phone', { phone: persian })
  assert.equal(first.status, 201)
  const second = await post('/office/link/phone', { phone: owner.phoneNumber })
  const pending = (await post('/office/adviser/link/pending', app)).body.link
  assert.match(pending.code, /^\d{8}$/)
  assert.equal((await post('/office/link/poll', { poll: first.body.poll })).status, 410) // replaced by the newer one
  // someone else's app cannot confirm it
  const stranger = await office('دفتر غریبه')
  assert.equal((await post('/office/adviser/link/confirm', { sessionToken: stranger.owner.sessionToken, code: pending.code })).status, 410)
  assert.equal((await post('/office/adviser/link/pending', { sessionToken: stranger.owner.sessionToken })).body.link, null)
  assert.equal((await post('/office/adviser/link/confirm', { ...app, code: pending.code })).status, 200)
  const got = await post('/office/link/poll', { poll: second.body.poll })
  assert.equal(got.status, 200)
  assert.ok(got.body.expiresAt)
  assert.equal((await post('/office/adviser/link/pending', app)).body.link, null)

  // refused in the app → the page is told
  const third = await post('/office/link/phone', { phone: owner.phoneNumber })
  const code = (await post('/office/adviser/link/pending', app)).body.link.code
  assert.equal((await post('/office/adviser/link/deny', { ...app, code })).status, 200)
  assert.equal((await post('/office/link/poll', { poll: third.body.poll })).body.error.code, 'link_denied')
  assert.equal((await post('/office/adviser/link/confirm', { ...app, code })).status, 410)
})

test('Amin #6346: a dashboard sign-in lasts 3 hours, signed out or not', async () => {
  const { h } = await office()
  assert.equal((await call('GET', '/office/overview', undefined, h)).status, 200)
  db.prepare('UPDATE office_sessions SET created_at = ? WHERE token = ?').run(new Date(Date.now() - 3 * 3600000 - 1000).toISOString(), h['x-office-token'])
  assert.equal((await call('GET', '/office/overview', undefined, h)).status, 401)
})

test('Amin #6345: the demo office on a KSS demo number — sample files, the app keeps working; only demo numbers; once', async () => {
  const routes = require('../src/officeRoutes')
  const phoneNumber = '+989123009999'
  await post('/auth/send-otp', { phoneNumber })
  await post('/auth/verify-otp', { phoneNumber, code: '123456' })
  const demo = (await post('/auth/register', { phoneNumber, referralCode: 'AZARSEED' })).body
  const plain = await account()
  assert.equal(routes.demoOffice(plain.phoneNumber).error, 'not_demo')
  const made = await admin('POST', '/office-demo', { phone: '09123009999' })
  assert.equal(made.status, 200, JSON.stringify(made.body))
  assert.equal(made.body.made, true)
  assert.equal((await admin('POST', '/office-demo', { phone: '09123009999' })).body.made, false)
  const status = (await post('/office/adviser/request/status', { sessionToken: demo.sessionToken })).body
  assert.equal(status.portal, true)
  assert.equal(status.demo, true)
  // sign in from the dashboard with the number, confirmed in the demo app
  const start = await post('/office/link/phone', { phone: '09123009999' })
  const code = (await post('/office/adviser/link/pending', { sessionToken: demo.sessionToken })).body.link.code
  await post('/office/adviser/link/confirm', { sessionToken: demo.sessionToken, code })
  const token = (await post('/office/link/poll', { poll: start.body.poll })).body.token
  const o = (await call('GET', '/office/overview', undefined, { 'x-office-token': token })).body
  assert.equal(o.office.name, 'دفتر املاک نمونه')
  assert.equal(o.files.length, 5)
  assert.equal((await post('/office/adviser/request/status', { sessionToken: plain.sessionToken })).body.demo, false)
})
