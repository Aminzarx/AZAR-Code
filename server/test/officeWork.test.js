// KSS (Amin #6333/#6337): the app's work in the office dashboard — applicants, matching, contracts, reminders, Divar.
// Run: node --test test/officeWork.test.js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'divar-gaffwOpk.json'))

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-office-work-test-'))
process.env.AZAR_DB_PATH = path.join(dir, 'auth.db')
process.env.AZAR_FIXED_OTP_CODE = '123456'
process.env.AZAR_SYNC_KEY = crypto.randomBytes(32).toString('base64')
process.env.AZAR_SYNC_BLOB_DIR = path.join(dir, 'blobs')
process.env.AZAR_OFFICE_SSO_SECRET = 'test-secret-for-office-sso'
process.env.KSS_PRICING_KEY = 'reader-key'

let server, base, db, stub
before(async () => {
  // pricing (records cost tokens per KB; a Divar import costs 5) and one Divar post
  const http = require('node:http')
  stub = http.createServer((req, res) => {
    if (req.url.startsWith('/posts/')) {
      if (req.url === '/posts/gaffwOpk') return res.writeHead(200, { 'content-type': 'application/json' }).end(fixture)
      return res.writeHead(404).end()
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ apps: [
      { key: 'eyvan_token_allowance', value: 100, price_toman: null },
      { key: 'eyvan_tokens_per_kb', value: 0.5, price_toman: null },
      { key: 'eyvan_divar_import_tokens', value: 5, price_toman: null },
      { key: 'eyvan_token_price', value: 50, price_toman: 50, vat_applies: false, vat_included: null, vat_rate: null },
      { key: 'eyvan_token_min_buy', value: 1200, price_toman: null }
    ] }))
  })
  await new Promise((r) => stub.listen(0, '127.0.0.1', r))
  process.env.KSS_PRICING_URL = `http://127.0.0.1:${stub.address().port}`
  process.env.DIVAR_POST_URL = `http://127.0.0.1:${stub.address().port}/posts`
  const express = require('express')
  db = require('../src/db')
  const app = express()
  app.set('trust proxy', 'loopback')
  app.use('/sync', require('../src/syncRoutes').router)
  app.use(express.json())
  app.use('/auth', require('../src/authRoutes'))
  app.use('/office', require('../src/officeRoutes').router)
  app.use('/divar', require('../src/divar').router)
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r)
  })
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  stub.close()
  server.close()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

let requests = 0
async function call(method, route, body, headers = {}) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.4.${++requests >> 8}.${requests & 255}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}
const post = (route, body, headers) => call('POST', route, body, headers)
const get = (route, headers) => call('GET', route, undefined, headers)

let nextPhone = 500
let nextName = 0
async function account() {
  const phoneNumber = `+98912400${String(++nextPhone).padStart(4, '0')}`
  assert.equal((await post('/auth/send-otp', { phoneNumber })).status, 204)
  assert.equal((await post('/auth/verify-otp', { phoneNumber, code: '123456' })).status, 204)
  const res = await post('/auth/register', { phoneNumber, referralCode: 'AZARSEED' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return { phoneNumber, ...res.body }
}
async function office(name = 'دفتر املاک کار', startTokens = 100000) {
  const owner = await account()
  const o = require('../src/officeRoutes')
  assert.equal((await post('/office/adviser/request', { sessionToken: owner.sessionToken, address: 'تهران، ونک', username: `work_${++nextName}`, password: 'parse-1234' })).status, 201)
  assert.equal(o.approveRequest(o.listRequests('pending').find((r) => r.userId === owner.userId).id, 'test').ok, true)
  await post('/auth/send-otp', { phoneNumber: owner.phoneNumber })
  await post('/auth/verify-otp', { phoneNumber: owner.phoneNumber, code: '123456' })
  const res = await post('/office/login', { phoneNumber: owner.phoneNumber, officeName: name })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  const officeId = db.prepare('SELECT id FROM offices WHERE owner_user_id = ?').get(owner.userId).id
  // the shared pool: set it to startTokens
  await get('/office/overview', { 'x-office-token': res.body.token }) // reads pricing once (allowance known)
  const have = o.officeBalance(officeId)
  if (startTokens !== have) require('../src/tokens').post(o.officeAccount(officeId), startTokens >= have ? 'admin_grant' : 'admin_deduct', startTokens - have, `test:${crypto.randomUUID()}`)
  return { owner, h: { 'x-office-token': res.body.token }, officeId }
}
const pull = async (owner) => (await post('/sync/pull', { sessionToken: owner.sessionToken })).body.rows
const spentOn = (userId, ref) =>
  db.prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM token_ledger WHERE account_id = ? AND ref = ? AND reason LIKE '%_spend'").get(userId, ref).s

const buyer = { name: 'مریم احمدی', phone: '۰۹۱۲ ۳۳۳ ۴۴۵۵', kinds: ['خرید'], propertyType: 'آپارتمان', city: 'تهران', region: 'ونک', minBudget: '8,000,000,000', maxBudget: 10000000000, minArea: 100, maxArea: 140, rooms: 2, description: 'طبقهٔ بالا' }
const file = { title: 'آپارتمان ۱۲۰ متری ونک', kind: 'فروش', propertyType: 'آپارتمان', region: 'ونک', size: 120, rooms: 2, price: 9500000000 }

test('applicants: the app form\'s rules, written into the app\'s copy, charged like an app record, listed and opened', async () => {
  const { owner, h } = await office()
  // validation as in the app (validateApplicantForm)
  let r = await post('/office/applicants', { ...buyer, name: '', city: '' }, h)
  assert.equal(r.status, 422)
  assert.equal(r.body.fields.name, 'نام الزامی است.')
  assert.equal(r.body.fields.city, 'شهر الزامی است.')
  assert.equal((await post('/office/applicants', { ...buyer, minBudget: null, maxBudget: null }, h)).body.fields.minBudget, 'بودجه را وارد کنید.')
  assert.match((await post('/office/applicants', { ...buyer, minBudget: 9, maxBudget: 5 }, h)).body.fields.maxBudget, /سقف بودجه/)
  assert.equal((await post('/office/applicants', { ...buyer, kinds: ['رهن و اجاره'], minBudget: null, maxBudget: null }, h)).body.fields.deposit, 'رهن یا اجارهٔ موردنظر را وارد کنید.')
  assert.match((await post('/office/applicants', { ...buyer, kinds: ['تهاتر'] }, h)).body.fields.barterItems, /تهاتر/)
  assert.match((await post('/office/applicants', { ...buyer, kinds: ['تهاتر'], barterItems: ['سایر'] }, h)).body.fields.barterOther, /سایر/)
  assert.equal((await post('/office/applicants', { ...buyer, rooms: 0 }, h)).status, 422)
  // made
  r = await post('/office/applicants', buyer, h)
  assert.equal(r.status, 201, JSON.stringify(r.body))
  const id = r.body.applicant.id
  assert.equal(r.body.applicant.phone, '09123334455')
  assert.deepEqual(r.body.applicant.kinds, ['خرید'])
  assert.equal(r.body.applicant.minBudget, 8000000000)
  assert.ok(r.body.tokens > 0, 'an applicant costs tokens like in the app')
  assert.ok(Math.abs(spentOn(owner.userId, `applicants:${id}`) + r.body.tokens) < 0.001)
  // the app has it, as a row its own form would make
  const row = (await pull(owner)).find((x) => x.t === 'applicants' && x.k === id).row
  assert.equal(row.user_id, owner.userId)
  assert.equal(row.full_name, 'مریم احمدی')
  assert.equal(row.preferred_transaction_type, 'خرید')
  assert.equal(row.status, 'active')
  assert.equal(row.is_convertible, 0)
  assert.equal(row.email, null)
  assert.ok(row.created_at && row.updated_at)
  // a barter + rent applicant: items kept as the app keeps them
  r = await post('/office/applicants', { name: 'رضا', phone: '09120001111', kinds: ['رهن و اجاره', 'تهاتر'], city: 'تهران', deposit: 0, rent: 20000000, convertible: true, minBudget: 5e9, barterItems: ['خودرو', 'سایر'], barterOther: 'سکه' }, h)
  assert.equal(r.status, 201, JSON.stringify(r.body))
  const row2 = (await pull(owner)).find((x) => x.k === r.body.applicant.id).row
  assert.equal(row2.preferred_transaction_type, 'رهن و اجاره، تهاتر')
  assert.equal(row2.barter_items, '["خودرو","سایر"]')
  assert.equal(row2.barter_other_description, 'سکه')
  assert.equal(row2.is_convertible, 1)
  assert.equal(row2.deposit_amount, 0, 'a رهن of 0 means «فقط اجاره», as in the app')
  // listed (an applicant made on the phone too), opened, archived
  await post('/sync/push', { sessionToken: owner.sessionToken, changes: [{ t: 'applicants', k: 'ph-a', row: { id: 'ph-a', user_id: owner.userId, full_name: 'از گوشی', phone_number: '09125556677', city: 'تهران', status: 'active', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' } }] })
  const list = (await get('/office/applicants', h)).body
  assert.equal(list.applicants.length, 3)
  assert.ok(list.applicants.some((a) => a.name === 'از گوشی'))
  assert.deepEqual(list.kinds, ['خرید', 'رهن و اجاره', 'تهاتر'])
  const one = (await get(`/office/applicants/${id}`, h)).body
  assert.equal(one.applicant.name, 'مریم احمدی')
  assert.deepEqual(one.contracts, [])
  assert.equal((await get('/office/applicants/nope', h)).status, 404)
  assert.equal((await post(`/office/applicants/${id}/status`, { status: 'archived' }, h)).body.applicant.status, 'archived')
  assert.equal((await pull(owner)).find((x) => x.k === id).row.status, 'archived')
  assert.equal((await get('/office/desk', h)).body.applicants, 2)
})

test('applicants: not enough tokens = refused with the shortfall, nothing stored', async () => {
  const { owner, h } = await office('دفتر کم‌توکن', 0)
  const r = await post('/office/applicants', buyer, h)
  assert.equal(r.status, 402, JSON.stringify(r.body))
  assert.equal(r.body.error.code, 'tokens_short')
  assert.ok(r.body.needed > 0)
  assert.equal((await pull(owner)).some((x) => x.t === 'applicants'), false)
})

test('matching: the app\'s rules — city, kind, budget, area, rooms; other city or a clashing kind never; a file with a contract leaves', async () => {
  const { owner, h } = await office()
  const a = (await post('/office/applicants', buyer, h)).body.applicant
  const good = (await post('/office/files', file, h)).body
  await post('/office/files', { ...file, title: 'رهنی', kind: 'رهن و اجاره', price: null, deposit: 5e8 }, h) // a buyer never sees rent-only
  const at = new Date().toISOString()
  // another city (written on the phone) never shows; an old server «sale» kind still reads as فروش
  await post('/sync/push', { sessionToken: owner.sessionToken, changes: [
    { t: 'properties', k: 'far', row: { id: 'far', owner_id: owner.userId, title: 'شیراز', city: 'شیراز', address: '', transaction_type: 'فروش', price: 9e9, status: 'active', created_at: at, updated_at: at } },
    { t: 'properties', k: 'old', row: { id: 'old', owner_id: owner.userId, title: 'قدیمی', city: 'تهران', address: '', transaction_type: 'sale', price: 2e10, status: 'active', created_at: at, updated_at: at } }
  ] })
  const m = (await get(`/office/matches/applicant/${a.id}`, h)).body
  assert.deepEqual(m.files.map((x) => x.file.title), [file.title, 'قدیمی'])
  assert.equal(m.files[0].score, 100)
  assert.equal(m.files[0].file.id, good.id, 'the match opens the dashboard\'s own file')
  assert.ok(m.files[0].criteria.includes('قیمت در محدوده بودجه'))
  assert.equal(m.files[1].score, 40, 'same city + kind, budget out of range')
  // the other way: the file's applicants
  const back = (await get(`/office/matches/file/${good.id}`, h)).body
  assert.deepEqual(back.applicants.map((x) => [x.applicant.name, x.score]), [['مریم احمدی', 100]])
  assert.equal((await get('/office/matches/file/none', h)).status, 404)
  // the overview page
  const all = (await get('/office/matches', h)).body
  assert.equal(all.applicants[0].count, 2)
  assert.equal(all.applicants[0].best, 100)
  // a contract closes the file: it is no longer suggested
  const k = await post('/office/contracts', { fileId: good.id, applicantId: a.id, type: 'خرید و فروش', startDate: '1405/08/09', endDate: '1405/08/09' }, h)
  assert.equal(k.status, 201, JSON.stringify(k.body))
  assert.deepEqual((await get(`/office/matches/applicant/${a.id}`, h)).body.files.map((x) => x.file.title), ['قدیمی'])
})

test('contracts: the app\'s fields and rules, linked to the file and the applicant, charged, in the app, status changes', async () => {
  const { owner, h } = await office()
  const a = (await post('/office/applicants', buyer, h)).body.applicant
  const f = (await post('/office/files', file, h)).body
  const ok = { fileId: f.id, applicantId: a.id, type: 'رهن و اجاره', amount: '1,200,000,000', startDate: '۱۴۰۵/۰۸/۰۱', endDate: '1406/8/1', trackingCode: 'TR-123', notes: 'کلید تحویل شد' }
  let r = await post('/office/contracts', { ...ok, fileId: 'x', applicantId: 'y', type: 'هر چیزی', startDate: '1405/13/01', amount: -1 }, h)
  assert.equal(r.status, 422)
  assert.deepEqual(Object.keys(r.body.fields).sort(), ['amount', 'applicantId', 'fileId', 'startDate', 'type'])
  assert.match((await post('/office/contracts', { ...ok, endDate: '1405/07/01' }, h)).body.fields.endDate, /بعد از تاریخ شروع/)
  r = await post('/office/contracts', ok, h)
  assert.equal(r.status, 201, JSON.stringify(r.body))
  const c = r.body.contract
  assert.equal(c.fileId, f.id)
  assert.equal(c.fileTitle, file.title)
  assert.equal(c.applicantName, 'مریم احمدی')
  assert.equal(c.startDate, '2026-10-23')
  assert.equal(c.endDate, '2027-10-23')
  assert.equal(c.amount, 1200000000)
  assert.ok(r.body.tokens > 0)
  assert.ok(Math.abs(spentOn(owner.userId, `contracts:${c.id}`) + r.body.tokens) < 0.001)
  const row = (await pull(owner)).find((x) => x.t === 'contracts' && x.k === c.id).row
  assert.equal(row.property_id, `office-${f.id}`, 'the copy\'s own key of the file')
  assert.equal(row.applicant_id, a.id)
  assert.equal(row.status, 'active')
  assert.equal(row.tracking_code, 'TR-123')
  assert.equal(row.user_id, owner.userId)
  const list = (await get('/office/contracts', h)).body
  assert.equal(list.contracts.length, 1)
  assert.deepEqual(list.kinds, ['خرید و فروش', 'رهن و اجاره', 'تهاتر'])
  assert.equal((await get('/office/desk', h)).body.contracts, 1)
  assert.equal((await post(`/office/contracts/${c.id}/status`, { status: 'completed' }, h)).body.contract.statusLabel, 'تکمیل‌شده')
  assert.equal((await pull(owner)).find((x) => x.k === c.id).row.status, 'completed')
  assert.equal((await post(`/office/contracts/${c.id}/status`, { status: 'x' }, h)).status, 422)
  assert.equal((await get(`/office/applicants/${a.id}`, h)).body.contracts.length, 1)
})

test('reminders: add (Jalali day + Tehran time), overdue / today / upcoming, mark done; in the app; no tokens', async () => {
  const { owner, h } = await office()
  const a = (await post('/office/applicants', buyer, h)).body.applicant
  const before = require('../src/officeRoutes').officeBalance((db.prepare('SELECT id FROM offices WHERE owner_user_id = ?').get(owner.userId)).id)
  let r = await post('/office/reminders', { title: '', date: '1405/14/01', time: '25:00' }, h)
  assert.equal(r.status, 422)
  assert.deepEqual(Object.keys(r.body.fields).sort(), ['date', 'time', 'title'])
  r = await post('/office/reminders', { title: 'تماس با مریم', date: '۱۴۰۵/۰۸/۰۹', time: '۰۹:۳۰', type: 'call', applicantId: a.id }, h)
  assert.equal(r.status, 201, JSON.stringify(r.body))
  assert.equal(r.body.reminder.remindAt, '2026-10-31T06:00:00.000Z', '09:30 in Tehran')
  assert.equal(r.body.reminder.applicantName, 'مریم احمدی')
  assert.equal(r.body.reminder.typeLabel, 'تماس')
  await post('/office/reminders', { title: 'بازدید', date: '1499/01/01', time: '10:00', type: 'visit' }, h)
  await post('/office/reminders', { title: 'دیروز', date: '1405/01/01', time: '10:00' }, h)
  const list = (await get('/office/reminders', h)).body.reminders
  const by = Object.fromEntries(list.map((x) => [x.title, x.bucket]))
  assert.equal(by['دیروز'], 'overdue')
  assert.equal(by['بازدید'], 'upcoming')
  const row = (await pull(owner)).find((x) => x.t === 'reminders' && x.k === r.body.reminder.id).row
  assert.equal(row.reminder_type, 'call')
  assert.equal(row.is_done, 0)
  assert.equal(row.applicant_id, a.id)
  assert.equal((await get('/office/desk', h)).body.reminders.overdue >= 1, true)
  const done = await post(`/office/reminders/${r.body.reminder.id}/done`, { done: true }, h)
  assert.equal(done.body.reminder.bucket, 'done')
  assert.equal((await pull(owner)).find((x) => x.k === r.body.reminder.id).row.is_done, 1)
  assert.equal((await post(`/office/reminders/${r.body.reminder.id}/done`, {}, h)).status, 422)
  assert.equal((await post('/office/reminders/nope/done', { done: true }, h)).status, 404)
  assert.equal(require('../src/officeRoutes').officeBalance((db.prepare('SELECT id FROM offices WHERE owner_user_id = ?').get(owner.userId)).id), before, 'reminders cost nothing')
})

test('Divar (Amin #6337): one switch with the app — off by default, on only with the words agreed, then a link fills a new file', async () => {
  const { owner, h } = await office()
  let d = (await get('/office/divar', h)).body
  assert.equal(d.on, false)
  assert.match(d.consent, /متعلق به خودتان/)
  assert.equal(d.cost, 5)
  assert.equal((await post('/office/divar/import', { link: 'https://divar.ir/v/gaffwOpk' }, h)).body.error.code, 'consent_required')
  assert.equal((await post('/office/divar/consent', { on: true }, h)).status, 422, 'the words must be agreed to')
  assert.equal((await post('/office/divar/consent', { on: true, agree: true }, h)).body.on, true)
  // the app sees the same switch
  assert.equal((await post('/divar/consent/status', { sessionToken: owner.sessionToken })).body.on, true)
  assert.equal(db.prepare('SELECT consent_text FROM divar_consents WHERE user_id = ? ORDER BY rowid DESC').get(owner.userId).consent_text, require('../src/divar').CONSENT_TEXT)
  assert.equal((await post('/office/divar/import', { link: 'https://example.com/x' }, h)).body.error.code, 'not_divar')
  const r = await post('/office/divar/import', { link: 'https://divar.ir/v/gaffwOpk' }, h)
  assert.equal(r.status, 200, JSON.stringify(r.body))
  assert.ok(r.body.file.title)
  assert.ok(['فروش', 'رهن و اجاره', 'تهاتر'].includes(r.body.file.kind))
  assert.equal(r.body.charged, 5)
  assert.equal((await get('/office/desk', h)).body.divar.on, true)
  // off again (from the dashboard) = off in the app
  assert.equal((await post('/office/divar/consent', { on: false }, h)).body.on, false)
  assert.equal((await post('/divar/consent/status', { sessionToken: owner.sessionToken })).body.on, false)
  d = (await get('/office/divar', h)).body
  assert.equal(d.on, false)
})

test('another office never sees or touches these records; no session = no access', async () => {
  const one = await office('دفتر یک')
  const two = await office('دفتر دو')
  const a = (await post('/office/applicants', buyer, one.h)).body.applicant
  assert.equal((await get('/office/applicants', two.h)).body.applicants.length, 0)
  assert.equal((await get(`/office/applicants/${a.id}`, two.h)).status, 404)
  assert.equal((await post('/office/reminders', { title: 'x', date: '1405/08/09', time: '10:00', applicantId: a.id }, two.h)).status, 422)
  assert.equal((await get('/office/applicants')).status, 401)
  assert.equal((await get('/office/desk')).status, 401)
})
