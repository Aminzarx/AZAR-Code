// Amin #5344: a new member can name the inviter by mobile number instead of the invite code
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-auth-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'

const express = require('express')
const db = require('../src/db')
const authRoutes = require('../src/authRoutes')
const invites = require('../src/inviteRoutes')
const phone = require('../src/phoneRoutes')
const sync = require('../src/syncRoutes')
const licence = require('../src/licenceRoutes')

let server
let base

before(async () => {
  const app = express()
  app.set('trust proxy', 'loopback') // as in index.js; each request below comes from its own address, so the per-address limits stay out of the way
  app.use('/sync', sync.router)
  app.use(express.json())
  app.use('/auth', authRoutes)
  app.use('/auth', invites.api)
  app.use('/auth', phone.router)
  app.use('/licence', licence.router)
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
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
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.${++requests >> 8}.${requests & 255}` },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

async function verified(phoneNumber) {
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
}

async function register(phoneNumber, referralCode) {
  await verified(phoneNumber)
  return post('/auth/register', { phoneNumber, referralCode })
}

test("the inviter's mobile (any form, Persian digits too) stands in for the code", async () => {
  const inviter = await register('+989120000101', 'AMINZX')
  assert.equal(inviter.status, 201)
  const a = await register('+989120000102', '09120000101')
  assert.equal(a.status, 201)
  const b = await register('+989120000103', '۰۹۱۲۰۰۰۰۱۰۱')
  assert.equal(b.status, 201)
  const rows = db
    .prepare('SELECT r.referrer_user_id, u.used_referral_code FROM referral_relationships r JOIN users u ON u.id = r.referred_user_id WHERE u.phone_number IN (?, ?)')
    .all('+989120000102', '+989120000103')
  assert.equal(rows.length, 2)
  for (const row of rows) {
    assert.equal(row.referrer_user_id, inviter.body.userId)
    assert.equal(row.used_referral_code, inviter.body.referralCode)
  }
})

test('an unknown mobile is its own error, and so is naming yourself', async () => {
  const bad = await register('+989120000104', '09129999999')
  assert.equal(bad.status, 422)
  assert.equal(bad.body.error.code, 'invalid_inviter_phone')
  const self = await register('+989120000105', '09120000105')
  assert.equal(self.status, 422)
})
