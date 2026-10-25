// KSS (Amin #5052/#5054): EYVAN's token ledger. Run: npm test (node's own test runner)
const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-tokens-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.KSS_PRICING_KEY = 'reader-key'

/** kss-pricing's «اپلیکیشن‌ها» as GET /apps answers it; each test sets the numbers it needs */
let apps = {}
let pricingDown = false
const pricing = http.createServer((req, res) => {
  if (pricingDown) {
    res.writeHead(503).end()
    return
  }
  if (req.url !== '/apps' || req.headers.authorization !== 'Bearer reader-key') {
    res.writeHead(401).end()
    return
  }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ apps: Object.entries(apps).map(([key, value]) => ({ key, value, price_toman: null })) }))
})

let express, db, authRoutes, invites, phone, sync, licence, tokens
let server
let base

before(async () => {
  await new Promise((resolve) => pricing.listen(0, '127.0.0.1', resolve))
  process.env.KSS_PRICING_URL = `http://127.0.0.1:${pricing.address().port}`
  express = require('express')
  db = require('../src/db')
  authRoutes = require('../src/authRoutes')
  invites = require('../src/inviteRoutes')
  phone = require('../src/phoneRoutes')
  sync = require('../src/syncRoutes')
  licence = require('../src/licenceRoutes')
  tokens = require('../src/tokens')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/sync', sync.router)
  app.use(express.json())
  app.use('/auth', authRoutes)
  app.use('/auth', invites.api)
  app.use('/auth', phone.router)
  app.use('/tokens', tokens.router)
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

beforeEach(() => {
  pricingDown = false
  apps = { eyvan_token_allowance: 100, eyvan_tokens_per_kb: 0.127 }
  licence.resetPricesCache()
})

function setApps(next) {
  apps = { ...apps, ...next }
  licence.resetPricesCache()
}

let requests = 0
async function post(route, body) {
  const res = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.${++requests >> 8}.${requests & 255}` },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

async function verified(phoneNumber) {
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
}

let nextPhone = 100
async function account(referralCode = 'AMINZX') {
  const phoneNumber = `+98912000${String(++nextPhone).padStart(4, '0')}`
  await verified(phoneNumber)
  const res = await post('/auth/register', { phoneNumber, referralCode })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return { ...res.body, phoneNumber }
}

const ledger = async (a) => (await post('/tokens/ledger', { sessionToken: a.sessionToken })).body
const push = (a, changes) => post('/sync/push', { sessionToken: a.sessionToken, changes })
/** a row of about `bytes` bytes once stored */
const sized = (bytes) => ({ text: 'x'.repeat(Math.max(0, bytes - 11)) })

/** the ledger's rows straight from the database (the history page is gone, #5105) */
const rowsOf = (a) =>
  db.prepare('SELECT reason, amount, ref FROM token_ledger WHERE account_id = ? AND amount <> 0 ORDER BY at DESC, rowid DESC').all(a.userId)
const photoRow = (key, subjectType, subjectId, bytes) => ({
  t: 'photos',
  k: key,
  row: { id: key, subject_type: subjectType, subject_id: subjectId, blob_hash: 'h'.repeat(64), data: null, bytes }
})

test('the allowance is the pricing value now: changing it changes every account at once (#5109)', async () => {
  const a = await account()
  assert.equal((await ledger(a)).summary.balance, 100)
  assert.equal(rowsOf(a).length, 0)
  setApps({ eyvan_token_allowance: 2540 })
  const l = await ledger(a)
  assert.equal(l.summary.balance, 2540)
  assert.equal(l.summary.allowance, 2540)
})

test('an account that already stores records opens with them charged; old per-push and photo rows are rebuilt', async () => {
  const b = await account()
  db.prepare("INSERT INTO sync_rows (account_id, tbl, row_key, data, bytes, updated_at) VALUES (?, 'properties', 'old', x'00', 10000, '2026-10-01')").run(b.userId)
  // rows of the model before #5108 (allowance row, a photo upload) go
  tokens.post(b.userId, 'allowance', 6350, `allowance:${b.userId}`)
  tokens.post(b.userId, 'photo_spend', -3, `blob:x:${b.userId}`)
  const opened = await ledger(b)
  assert.equal(opened.summary.balance, 100 - 1.27)
  assert.equal(opened.summary.spentBy.files, 1.27)
  assert.deepEqual(rowsOf(b).map((r) => r.reason), ['file_spend'])
})

test('Amin #5108: only a saved record costs, with its photos; a push sent again changes nothing; deleting gives back', async () => {
  const a = await account()
  // other tables (settings, reminders, deals) cost nothing
  await push(a, [{ t: 'reminders', k: 'r1', row: sized(5000) }, { t: 'deals', k: 'd1', row: sized(5000) }])
  assert.equal((await ledger(a)).summary.balance, 100)

  // a photo upload costs nothing by itself
  const photo = crypto.randomBytes(20000).toString('base64')
  assert.equal((await post('/sync/blob/put', { sessionToken: a.sessionToken, data: photo })).status, 200)
  assert.equal((await ledger(a)).summary.balance, 100)

  // the file saved with its photo: one charge, record + photo
  const file = { t: 'properties', k: 'p1', row: sized(10000) }
  assert.equal((await push(a, [file, photoRow('ph1', 'property', 'p1', 20000)])).status, 200)
  const one = await ledger(a)
  assert.ok(Math.abs(one.summary.balance - (100 - 30 * 0.127)) < 0.01, String(one.summary.balance))
  assert.deepEqual(rowsOf(a).map((r) => [r.reason, r.ref]), [['file_spend', 'properties:p1']])

  // the phone sends the same save again (offline replay): nothing more
  assert.equal((await push(a, [file, photoRow('ph1', 'property', 'p1', 20000)])).status, 200)
  assert.equal((await ledger(a)).summary.balance, one.summary.balance)

  // applicants and contracts on their own lines
  await push(a, [{ t: 'applicants', k: 'x1', row: sized(2000) }, { t: 'contracts', k: 'c1', row: sized(5000) }])
  const kinds = (await ledger(a)).summary.spentBy
  assert.ok(kinds.applicants > 0 && kinds.contracts > 0 && kinds.files > 0, JSON.stringify(kinds))

  // the photo removed in an edit: its part comes back; the file deleted: all of it
  await push(a, [file, { t: 'photos', k: 'ph1', row: null }])
  assert.ok(Math.abs((await ledger(a)).summary.spentBy.files - 1.27) < 0.01)
  await push(a, [{ t: 'properties', k: 'p1', row: null }, { t: 'applicants', k: 'x1', row: null }, { t: 'contracts', k: 'c1', row: null }])
  const back = await ledger(a)
  assert.ok(Math.abs(back.summary.balance - 100) < 0.01, String(back.summary.balance))
  assert.ok(rowsOf(a).some((r) => r.reason === 'file_refund' && r.amount > 0))
})

test('the balance never goes below zero: a save that does not fit is refused whole and nothing is stored', async () => {
  setApps({ eyvan_token_allowance: 1 })
  const a = await account()
  const res = await push(a, [{ t: 'properties', k: 'big', row: sized(20000) }])
  assert.equal(res.status, 422)
  assert.equal(res.body.error.code, 'tokens_short')
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sync_rows WHERE account_id = ?').get(a.userId).n, 0)
  assert.equal((await ledger(a)).summary.balance, 1)
  // a small one still fits
  assert.equal((await push(a, [{ t: 'properties', k: 'small', row: sized(1000) }])).status, 200)
  assert.ok((await ledger(a)).summary.balance >= 0)
})

test('referral bonus: only once the invited colleague is active (first file on the server), only once, within the daily cap', async () => {
  setApps({ eyvan_referral_bonus: 10, eyvan_daily_bonus_cap: 15 })
  const a = await account()
  const b = await account(a.referralCode)
  const c = await account(a.referralCode)

  // b signs up and sends only settings: not active yet
  await push(b, [{ t: 'application_settings', k: 'display_name', row: { key: 'display_name', value: 'B' } }])
  assert.equal((await ledger(a)).summary.earned, 0)

  // b's first file reaches the server: a earns once
  await push(b, [{ t: 'properties', k: 'p1', row: sized(500) }])
  await push(b, [{ t: 'applicants', k: 'x1', row: sized(500) }])
  assert.equal((await ledger(a)).summary.earned, 10)

  // c is active the same day, but 10 more would pass the cap of 15: not paid today
  await push(c, [{ t: 'properties', k: 'p1', row: sized(500) }])
  assert.equal((await ledger(a)).summary.earned, 10)
  // the next day (yesterday's bonus moved back a day), c's next push pays it
  db.prepare("UPDATE token_ledger SET at = '2020-01-01T00:00:00.000Z' WHERE account_id = ? AND reason = 'referral_bonus'").run(a.userId)
  await push(c, [{ t: 'properties', k: 'p2', row: sized(500) }])
  assert.equal((await ledger(a)).summary.earned, 20)
})

test('no daily cap set = no bonus at all; bonuses stay off until their number is set', async () => {
  setApps({ eyvan_referral_bonus: 10 })
  const a = await account()
  const b = await account(a.referralCode)
  await push(b, [{ t: 'properties', k: 'p1', row: sized(500) }])
  assert.equal((await ledger(a)).summary.earned, 0)

  setApps({ eyvan_referral_bonus: null, eyvan_daily_bonus_cap: 100 })
  const c = await account(a.referralCode)
  await push(c, [{ t: 'properties', k: 'p1', row: sized(500) }])
  assert.equal((await ledger(a)).summary.earned, 0)
})

test('profile bonus: once, when the name, agency and photo are all on the server', async () => {
  setApps({ eyvan_profile_bonus: 5, eyvan_daily_bonus_cap: 50 })
  const a = await account()
  const setting = (key) => ({ t: 'application_settings', k: key, row: { key, value: 'v' } })
  await push(a, [setting('display_name'), setting('agency_name')])
  assert.equal((await ledger(a)).summary.earned, 0)
  await push(a, [setting('profile_photo')])
  await push(a, [setting('display_name')])
  const l = await ledger(a)
  assert.equal(l.summary.earned, 5)
  assert.equal(l.summary.earnedBy.profile, 5)
  assert.equal(rowsOf(a).filter((r) => r.reason === 'profile_bonus').length, 1)
})

test('no referral bonus for a deleted referrer', async () => {
  setApps({ eyvan_referral_bonus: 10, eyvan_daily_bonus_cap: 100 })
  const a = await account()
  const b = await account(a.referralCode)
  db.prepare("UPDATE users SET deleted_at = '2026-10-24' WHERE id = ?").run(a.userId)
  await push(b, [{ t: 'properties', k: 'p1', row: sized(500) }])
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM token_ledger WHERE reason = 'referral_bonus' AND account_id = ?").get(a.userId).n, 0)
})

test('number change: off while its token cost is empty; then spends it with the move; refused when short', async () => {
  const a = await account()
  const newNumber = `+98912000${String(++nextPhone).padStart(4, '0')}`
  await verified(newNumber)
  let res = await post('/auth/change-phone', { sessionToken: a.sessionToken, newPhoneNumber: newNumber })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.code, 'phone_change_off')

  setApps({ eyvan_phone_change_tokens: 500 })
  res = await post('/auth/change-phone', { sessionToken: a.sessionToken, newPhoneNumber: newNumber })
  assert.equal(res.status, 422)
  assert.equal(res.body.error.code, 'tokens_short')
  assert.equal(db.prepare('SELECT phone_number FROM users WHERE id = ?').get(a.userId).phone_number, a.phoneNumber)

  setApps({ eyvan_phone_change_tokens: 30 })
  res = await post('/auth/change-phone', { sessionToken: a.sessionToken, newPhoneNumber: newNumber })
  assert.equal(res.status, 200)
  const l = await ledger(a)
  assert.equal(l.summary.balance, 70)
  assert.equal(l.summary.spentBy.phoneChange, 30)
  assert.equal(rowsOf(a)[0].reason, 'phone_change')
})

test('pricing without the allowance or tokens per KB: the ledger is off (no made-up numbers) and the old quota guards pushes', async () => {
  setApps({ eyvan_token_allowance: null })
  const a = await account()
  assert.equal((await post('/tokens/ledger', { sessionToken: a.sessionToken })).status, 503)
  assert.equal((await push(a, [{ t: 'properties', k: 'p1', row: sized(500) }])).status, 200)
  assert.equal(rowsOf(a).length, 0)
})

test('token packs are not sold until the wallet decision', async () => {
  assert.equal((await post('/tokens/buy', {})).status, 403)
})

// Kssx.ir 2026-10-25 (#5109): pricing down after a restart → the last known allowance, never 0
test('a restart while kss-pricing is down keeps the last known allowance', async () => {
  setApps({ eyvan_token_allowance: 2540 })
  assert.equal((await licence.appPrices()).tokenAllowance, 2540)
  licence.resetPricesCache({ keepDisk: true })
  pricingDown = true
  assert.equal((await licence.appPrices()).tokenAllowance, 2540)
})
