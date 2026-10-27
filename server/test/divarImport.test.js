// Navid 2026-10-27 «ورود آگهی از دیوار»: POST /divar/import. Run: npm test
const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'divar-gaffwOpk.json'))

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-divar-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.KSS_PRICING_KEY = 'reader-key'

let apps = {}
let divarHits = 0
const fake = http.createServer((req, res) => {
  if (req.url === '/apps') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ apps: Object.entries(apps).map(([key, value]) => ({ key, value, price_toman: null })) }))
    return
  }
  divarHits++
  if (req.url === '/posts/gaffwOpk') {
    res.writeHead(200, { 'content-type': 'application/json' }).end(fixture)
    return
  }
  res.writeHead(404).end()
})

let db, licence, tokens, server, base
before(async () => {
  await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve))
  const fakeBase = `http://127.0.0.1:${fake.address().port}`
  process.env.KSS_PRICING_URL = fakeBase
  process.env.DIVAR_POST_URL = `${fakeBase}/posts`
  const express = require('express')
  db = require('../src/db')
  licence = require('../src/licenceRoutes')
  tokens = require('../src/tokens')
  require('../src/syncRoutes')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use(express.json())
  app.use('/auth', require('../src/authRoutes'))
  app.use('/auth', require('../src/inviteRoutes').api)
  app.use('/divar', require('../src/divar').router)
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
  fake.close()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  apps = { eyvan_token_allowance: 100, eyvan_tokens_per_kb: 0.127, eyvan_divar_import_tokens: 5 }
  licence.resetPricesCache()
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

let nextPhone = 300
async function account() {
  const phoneNumber = `+98912000${String(++nextPhone).padStart(4, '0')}`
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
  const res = await post('/auth/register', { phoneNumber, referralCode: 'AMINZX' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return res.body
}
const spent = (a) =>
  db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM token_ledger WHERE account_id = ? AND reason = 'divar_import'").get(a.userId).s

test('the shared post comes back as a new file and is charged once a day', async () => {
  const a = await account()
  const first = await post('/divar/import', { sessionToken: a.sessionToken, link: 'https://divar.ir/v/gaffwOpk' })
  assert.equal(first.status, 200, JSON.stringify(first.body))
  assert.equal(first.body.post.area, 142)
  assert.equal(first.body.charged, 5)
  const again = await post('/divar/import', { sessionToken: a.sessionToken, link: 'https://divar.ir/v/gaffwOpk' })
  assert.equal(again.body.charged, 0)
  assert.equal(spent(a), -5)
})

test('no price in kss-pricing = the import is off (Amin #4302)', async () => {
  delete apps.eyvan_divar_import_tokens
  licence.resetPricesCache()
  const a = await account()
  const res = await post('/divar/import', { sessionToken: a.sessionToken, link: 'https://divar.ir/v/gaffwOpk' })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.code, 'import_off')
})

test('a gone post, a foreign link and a signed-out phone get clear answers and no charge', async () => {
  const a = await account()
  const gone = await post('/divar/import', { sessionToken: a.sessionToken, link: 'https://divar.ir/v/zzzzzzzz' })
  assert.equal(gone.status, 404)
  assert.equal(gone.body.error.code, 'post_gone')
  const foreign = await post('/divar/import', { sessionToken: a.sessionToken, link: 'https://sheypoor.com/v/abc123' })
  assert.equal(foreign.body.error.code, 'not_divar')
  const out = await post('/divar/import', { sessionToken: 'nope', link: 'https://divar.ir/v/gaffwOpk' })
  assert.equal(out.status, 401)
  assert.equal(spent(a), 0)
})

test('the same post is read from Divar once an hour, not per user', async () => {
  const before = divarHits
  const b = await account()
  await post('/divar/import', { sessionToken: b.sessionToken, link: 'gaffwOpk' })
  assert.equal(divarHits, before)
})
