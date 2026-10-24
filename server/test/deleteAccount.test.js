// KSS (Amin #5045): deleting an account never breaks the referral chain. Run: npm test (node's own test runner)
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

async function deleteAccount(phoneNumber) {
  await verified(phoneNumber)
  return post('/auth/delete-account', { phoneNumber })
}

const links = (userId) =>
  db
    .prepare('SELECT referrer_user_id, referred_user_id FROM referral_relationships WHERE referrer_user_id = ? OR referred_user_id = ?')
    .all(userId, userId)

test('delete keeps the chain both ways: A → B → C, B deleted', async () => {
  const a = (await register('+989120000001', 'AMINZX')).body
  const b = (await register('+989120000002', a.referralCode)).body
  const c = (await register('+989120000003', b.referralCode)).body
  db.prepare("INSERT INTO sync_rows (account_id, tbl, row_key, data, bytes, updated_at) VALUES (?, 'properties', 'p1', '{}', 2, '2026-10-24')").run(b.userId)

  assert.equal((await deleteAccount('+989120000002')).status, 204)

  const tomb = db.prepare('SELECT * FROM users WHERE id = ?').get(b.userId)
  assert.ok(tomb.deleted_at)
  assert.equal(tomb.phone_number, `deleted:${b.userId}`)
  assert.deepEqual(links(b.userId), [
    { referrer_user_id: a.userId, referred_user_id: b.userId },
    { referrer_user_id: b.userId, referred_user_id: c.userId }
  ])
  // nothing personal is left
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(b.userId).n, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sync_rows WHERE account_id = ?').get(b.userId).n, 0)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE phone_number = '+989120000002'").get().n, 0)
})

test('the deleted number can sign up again, as a new account that needs a code', async () => {
  const a = (await register('+989120000011', 'AMINZX')).body
  const old = (await register('+989120000012', a.referralCode)).body
  await deleteAccount('+989120000012')

  await verified('+989120000012')
  const login = await post('/auth/login', { phoneNumber: '+989120000012' })
  assert.equal(login.status, 422) // no account: it signs up with a code again

  const fresh = await register('+989120000012', a.referralCode)
  assert.equal(fresh.status, 201)
  assert.notEqual(fresh.body.userId, old.userId)
  assert.notEqual(fresh.body.referralCode, old.referralCode)
  assert.equal(links(old.userId).length, 1) // the old link stays with the tombstone
})

test('a tombstone cannot sign in', async () => {
  const a = (await register('+989120000021', 'AMINZX')).body
  const b = (await register('+989120000022', a.referralCode)).body
  await deleteAccount('+989120000022')
  const marker = `deleted:${b.userId}`
  assert.equal((await post('/auth/send-otp', { phoneNumber: marker })).status, 422)
  assert.equal((await post('/auth/verify-otp', { phoneNumber: marker, code: '123456' })).status, 422)
  assert.equal((await post('/auth/login', { phoneNumber: marker })).status, 401)
  assert.equal((await post('/auth/login', { phoneNumber: '+989120000022' })).status, 401)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(b.userId).n, 0)
})

test("a tombstone's referral code no longer brings anyone in, and is never minted again", async () => {
  const a = (await register('+989120000031', 'AMINZX')).body
  const b = (await register('+989120000032', a.referralCode)).body
  await deleteAccount('+989120000032')
  const res = await register('+989120000033', b.referralCode)
  assert.equal(res.status, 422)
  assert.equal(res.body.error.code, 'invalid_referral_code')
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE referral_code = ?').get(b.referralCode).n, 1)
})
