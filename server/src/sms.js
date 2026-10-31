const crypto = require('node:crypto')

/**
 * KSS (Amin #4117): sign-in codes go out by SMS through KSS's Kavenegar account, the verify/lookup API with a template
 * made in the Kavenegar panel (the template holds the text; only the code is sent), as kssx.ir does. Iranian mobiles
 * only. KAVENEGAR_API_KEY and KAVENEGAR_OTP_TEMPLATE come from the service's environment file, never from the code.
 */
const ready = () => !!process.env.KAVENEGAR_API_KEY && !!process.env.KAVENEGAR_OTP_TEMPLATE

/** +989121234567, 989121234567 or 09121234567 → 09121234567; anything that is not an Iranian mobile → null */
function iranMobile(phone) {
  const d = String(phone).replace(/\D/g, '')
  const m = d.match(/^(?:98|0098|0)?(9\d{9})$/)
  return m ? '0' + m[1] : null
}

// KSS test numbers (AZAR_TEST_OTP_NUMBERS=09xxxxxxxxx,…): sign in with a fixed code, shown as «test» in admin, left out
// of the nightly backup (Amin #5292: a test account for him to try the app with)
const TEST_NUMBERS = new Set(
  String(process.env.AZAR_TEST_OTP_NUMBERS || '')
    .split(',')
    .map((n) => iranMobile(n.trim()))
    .filter(Boolean)
)
const isTestNumber = (phone) => TEST_NUMBERS.has(iranMobile(phone || '') || '')

const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0')
const hashCode = (phone, code) => crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex')
const sameCode = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

async function viaSms(mobile, code, waitMs) {
  const key = process.env.KAVENEGAR_API_KEY
  if (!ready()) return false
  const q = new URLSearchParams({ receptor: mobile, token: code, template: process.env.KAVENEGAR_OTP_TEMPLATE })
  try {
    const res = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(key)}/verify/lookup.json?${q}`, {
      method: 'POST',
      signal: AbortSignal.timeout(waitMs)
    })
    const j = await res.json().catch(() => null)
    if (res.ok && j?.return?.status === 200) return true
    console.error(`[sms] kavenegar ${res.status} ${j?.return?.status ?? ''}`.trim())
  } catch (e) {
    console.error('[sms] kavenegar', e.message)
  }
  return false
}

// ------------------------------------------------------------ emergency mode (Amin #6419) ----
// /etc/kss/emergency.json is written only by the root helper (kss-emergency-set); every service only reads it, at most
// every 2 s. Missing or broken = every condition off. Normal: SMS only. «intl_cut»: SMS, then — on a failure or no answer
// in 8 s — the same code in a Rubika chat from KSS's account (IRIS loopback endpoint). «sms_down»: Rubika first.
// Rubika is never used outside emergency mode; codes are never logged; any failure reads the same.
const fs = require('node:fs')
let state = { at: 0, mtime: -2, on: {} }
function conditions() {
  const now = Date.now()
  if (now - state.at < 2000) return state.on
  const file = process.env.AZAR_EMERGENCY_FILE || '/etc/kss/emergency.json'
  try {
    const mtime = fs.statSync(file).mtimeMs
    if (mtime !== state.mtime) {
      const c = JSON.parse(fs.readFileSync(file, 'utf8'))?.conditions || {}
      state.on = { intl_cut: c.intl_cut?.on === true, sms_down: c.sms_down?.on === true }
      state.mtime = mtime
    }
  } catch (e) {
    if (e.code !== 'ENOENT' && state.mtime !== -1) console.error('[emergency] state file unreadable; all conditions off:', e.message)
    state.on = {}
    state.mtime = -1
  }
  state.at = now
  return state.on
}
const faDigits = (v) => v.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
let rubikaHour = { hour: -1, n: 0 }
let rubikaPausedUntil = 0
async function viaRubika(mobile, code) {
  const url = process.env.KSS_IRIS_NOTIFY_URL
  const token = process.env.KSS_IRIS_NOTIFY_TOKEN
  if (!url || !token || Date.now() < rubikaPausedUntil) return false
  const hour = Math.floor(Date.now() / 3600000)
  if (rubikaHour.hour !== hour) rubikaHour = { hour, n: 0 }
  if (rubikaHour.n >= (Number(process.env.KSS_RUBIKA_OTP_HOURLY) || 120)) {
    console.error('[sms] rubika hourly cap reached')
    return false
  }
  rubikaHour.n += 1
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/rubika-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to_phone: mobile, text: `کد ورود KSS: ${faDigits(code)} — این کد را به کسی ندهید.`, purpose: 'otp', ref: `azar-auth:${Date.now().toString(36)}` }),
      signal: AbortSignal.timeout(15000)
    })
    const j = await res.json().catch(() => null)
    if (j?.result === 'sent') return true
    if (j?.result === 'retry_after') rubikaPausedUntil = Date.now() + 1000 * Math.min(600, Math.max(5, Number(j.retry_after) || 60))
    console.error('[sms] rubika not sent', res.status, j?.result ?? '')
  } catch (e) {
    console.error('[sms] rubika', e.message)
  }
  return false
}

/** 'sms' | 'rubika' (where the code went); throws when nothing could send it (nothing is stored then) */
async function sendCode(mobile, code) {
  const on = conditions()
  const order = on.sms_down ? ['rubika', 'sms'] : on.intl_cut ? ['sms', 'rubika'] : ['sms']
  for (const ch of order) {
    const ok = ch === 'sms' ? await viaSms(mobile, code, order.length > 1 && order[0] === 'sms' ? 8000 : 10000) : await viaRubika(mobile, code)
    if (ok) return ch
  }
  throw new Error('code not sent')
}
/** emergency mode can send codes even when SMS is not set up */
const canSend = () => ready() || (!!(conditions().intl_cut || conditions().sms_down) && !!process.env.KSS_IRIS_NOTIFY_URL)

module.exports = { ready, canSend, iranMobile, isTestNumber, newCode, hashCode, sameCode, sendCode }
