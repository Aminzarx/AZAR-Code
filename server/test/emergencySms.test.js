// KSS (Amin #6419): the sign-in code chain in emergency mode. Run: node --test test/emergencySms.test.js
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azar-emergency-'))
const file = path.join(dir, 'emergency.json')
process.env.AZAR_EMERGENCY_FILE = file
delete process.env.KAVENEGAR_API_KEY // SMS is «down» in these tests unless a case sets it
const sms = require('../src/sms')

let iris, got = [], answer = { result: 'sent' }
before(async () => {
  iris = http.createServer((q, res) => {
    let b = ''
    q.on('data', (d) => (b += d))
    q.on('end', () => {
      got.push({ url: q.url, auth: q.headers.authorization, body: JSON.parse(b || '{}') })
      res.writeHead(answer.result === 'retry_after' ? 429 : 200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(answer))
    })
  })
  await new Promise((r) => iris.listen(0, '127.0.0.1', r))
  process.env.KSS_IRIS_NOTIFY_URL = `http://127.0.0.1:${iris.address().port}/internal/notify/v1`
  process.env.KSS_IRIS_NOTIFY_TOKEN = 'notify-test-token'
})
after(() => {
  iris.close()
  fs.rmSync(dir, { recursive: true, force: true })
})
const set = async (c) => {
  fs.writeFileSync(file, JSON.stringify({ version: 1, conditions: Object.fromEntries(Object.entries(c).map(([k, on]) => [k, { on }])) }))
  await new Promise((r) => setTimeout(r, 2100)) // the reader looks at most every 2 s
}

test('normal: SMS only — with SMS down nothing is sent, Rubika is never asked, and nothing can send', async () => {
  await set({ intl_cut: false })
  assert.equal(sms.canSend(), false)
  await assert.rejects(sms.sendCode('09120000001', '123456'))
  assert.equal(got.length, 0)
})

test('intl_cut: SMS down → the same code in Rubika with fixed words; a refusal reads like any failure; a flood pauses Rubika', async () => {
  await set({ intl_cut: true })
  assert.equal(sms.canSend(), true)
  assert.equal(await sms.sendCode('09120000002', '234567'), 'rubika')
  assert.equal(got[0].url, '/internal/notify/v1/rubika-text')
  assert.equal(got[0].auth, 'Bearer notify-test-token')
  assert.equal(got[0].body.to_phone, '09120000002')
  assert.equal(got[0].body.purpose, 'otp')
  assert.match(got[0].body.text, /۲۳۴۵۶۷/)
  answer = { result: 'unreachable' }
  await assert.rejects(sms.sendCode('09120000003', '345678'), /code not sent/)
  answer = { result: 'retry_after', retry_after: 60 }
  await assert.rejects(sms.sendCode('09120000004', '456789'))
  const n = got.length
  answer = { result: 'sent' }
  await assert.rejects(sms.sendCode('09120000005', '567890'))
  assert.equal(got.length, n, 'paused: IRIS not asked again')
})

test('a broken state file = all off (normal)', async () => {
  fs.writeFileSync(file, '{not json')
  await new Promise((r) => setTimeout(r, 2100))
  assert.equal(sms.canSend(), false)
})
