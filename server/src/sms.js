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

const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0')
const hashCode = (phone, code) => crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex')
const sameCode = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

async function sendCode(mobile, code) {
  const key = process.env.KAVENEGAR_API_KEY
  const q = new URLSearchParams({ receptor: mobile, token: code, template: process.env.KAVENEGAR_OTP_TEMPLATE })
  const res = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(key)}/verify/lookup.json?${q}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000)
  })
  const j = await res.json().catch(() => null)
  if (!res.ok || j?.return?.status !== 200) throw new Error(`kavenegar ${res.status} ${j?.return?.status ?? ''}`.trim())
}

module.exports = { ready, iranMobile, newCode, hashCode, sameCode, sendCode }
