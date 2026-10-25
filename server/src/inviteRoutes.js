const express = require('express')
const rateLimit = require('express-rate-limit')
const crypto = require('node:crypto')
const db = require('./db')

// KSS (Amin #4311, v1.4.0): «دعوت با پیامک». A signed-in user names a
// colleague's mobile; the invite (referrer → mobile) is recorded here and a
// personal link /i/<code> comes back. The app then opens the phone's own
// SMS composer with that link (the user's SIM, no SMS service of ours).
// The link's page offers the install file and copies the referrer's code.
// When that mobile signs in for the first time, /auth/login applies the
// invite (see applyInvite) so no referral code is asked for.

const PHONE_NUMBER_PATTERN = /^\+989\d{9}$/
const INVITE_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const INVITE_CODE_LENGTH = 7
// Amin #4623: every address customers see is on kssx.ir (old api.zarandix.ir/i/ links redirect here in nginx)
const PUBLIC_BASE_URL = process.env.AZAR_PUBLIC_BASE_URL || 'https://eyvan.kssx.ir'
// Amin #4625: the «اطلاعات بیشتر» line appears only once a promotional article page is set
const INVITE_ARTICLE_URL = process.env.AZAR_INVITE_ARTICLE_URL || ''

/** Amin #4625: the invite SMS, word for word. The app sends this text as is. */
function inviteMessage(url) {
  const lines = ['سلام، لینک دانلود اپلیکیشن دفترکار همراه مشاوران املاک:', url]
  if (INVITE_ARTICLE_URL) lines.push('اطلاعات بیشتر:', INVITE_ARTICLE_URL)
  return lines.join('\n')
}

const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
})

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

function newInviteCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.randomBytes(INVITE_CODE_LENGTH)
    let code = ''
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length]
    }
    if (!db.prepare('SELECT 1 FROM invites WHERE code = ?').get(code)) {
      return code
    }
  }
  throw new Error('Could not mint a unique invite code after 5 attempts.')
}

const api = express.Router()

// POST /auth/invite { sessionToken, phoneNumber } → { code, url, referralCode }
api.post('/invite', inviteLimiter, (req, res) => {
  const sessionToken = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : ''
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''

  const session = sessionToken
    ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(sessionToken)
    : null
  const referrer = session ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) : null
  if (!referrer) {
    return fail(res, 401, 'authentication_required', 'Sign in again to send invites.')
  }
  if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    return fail(res, 422, 'invalid_phone_number', 'Enter a valid Iranian mobile number.')
  }
  if (phoneNumber === referrer.phone_number) {
    return fail(res, 422, 'self_referral', 'You cannot invite yourself.')
  }
  if (db.prepare('SELECT 1 FROM users WHERE phone_number = ?').get(phoneNumber)) {
    return fail(res, 422, 'phone_already_registered', 'This number already uses the app.')
  }

  // one open invite per mobile: the latest inviter wins
  const code = newInviteCode()
  db.transaction(() => {
    db.prepare('DELETE FROM invites WHERE phone_number = ? AND used_at IS NULL').run(phoneNumber)
    db.prepare(
      'INSERT INTO invites (code, referrer_user_id, phone_number, created_at) VALUES (?, ?, ?, ?)'
    ).run(code, referrer.id, phoneNumber, new Date().toISOString())
  })()

  const url = `${PUBLIC_BASE_URL}/i/${code}`
  res.status(201).json({ code, url, message: inviteMessage(url), referralCode: referrer.referral_code })
})

/** The open invite for a mobile, with its referrer's user row, or null. */
function findOpenInvite(phoneNumber) {
  const invite = db
    .prepare('SELECT * FROM invites WHERE phone_number = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1')
    .get(phoneNumber)
  if (!invite) return null
  const referrer = db.prepare('SELECT * FROM users WHERE id = ?').get(invite.referrer_user_id)
  return referrer ? { invite, referrer } : null
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

const page = express.Router()

// GET /i/<code> — the invite link's page: install file + the referrer's code
page.get('/i/:code', (req, res) => {
  const code = String(req.params.code || '').toLowerCase()
  const invite = /^[a-z0-9]{4,16}$/.test(code)
    ? db.prepare('SELECT * FROM invites WHERE code = ?').get(code)
    : null
  const referrer = invite ? db.prepare('SELECT * FROM users WHERE id = ?').get(invite.referrer_user_id) : null
  res.set('Cache-Control', 'no-store')
  res.status(invite ? 200 : 404).type('html').send(renderPage(invite ? 'invite' : 'missing', referrer ? referrer.referral_code : ''))
})

// GET /dl — the plain download page (no longer linked: since Amin #5135 eyvan.kssx.ir/ goes to kssx.ir's apps page)
page.get('/dl', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.type('html').send(renderPage('download', ''))
})

const LEADS = {
  invite: 'یک همکار شما را به ایوان، دفتر کار همراه مشاوران املاک، دعوت کرده است.',
  missing: 'این دعوت پیدا نشد. از دعوت‌کننده بخواهید دوباره بفرستد.',
  download: 'ایوان، دفتر کار همراه مشاوران املاک: فایل‌ها، متقاضیان، تطبیق، معامله‌ها و قراردادها در گوشی شما.'
}

function renderPage(kind, referralCode) {
  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${kind === 'download' ? 'دریافت ایوان' : 'دعوت به ایوان'}</title>
<style>
body{margin:0;font-family:Tahoma,sans-serif;background:#f4f6f9;color:#1c2b3a}
.wrap{max-width:420px;margin:0 auto;padding:32px 20px}
.hero{background:#21364f;color:#fff;border-radius:20px;padding:28px 22px}
h1{font-size:22px;margin:0 0 8px}p{line-height:1.9;margin:0}
.code{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:14px;padding:14px 16px;margin-top:18px}
.code b{font-size:22px;letter-spacing:3px;direction:ltr;color:#21364f}
button,.btn{font:inherit;border:0;border-radius:12px;padding:12px 16px;cursor:pointer}
.copy{background:#edf1f6;color:#21364f}
.btn{display:block;text-align:center;text-decoration:none;background:#21364f;color:#fff;font-weight:bold;margin-top:20px;padding:16px}
.note{font-size:13px;color:#4a6383;margin-top:14px}
</style></head><body><div class="wrap">
<div class="hero"><h1>${kind === 'download' ? 'ایوان' : 'دعوت به ایوان'}</h1>
<p>${LEADS[kind]}</p></div>
${referralCode ? `<div class="code"><b id="c">${escapeHtml(referralCode)}</b><button class="copy" onclick="copyCode()">کپی کد</button></div>
<p class="note" id="n">با همین شماره‌ای که دعوت شده‌اید وارد شوید؛ کد معرف خودکار ثبت می‌شود.</p>` : ''}
<a class="btn" id="dl" href="https://kssx.ir/fa/solutions/apps" onclick="copyCode()">دریافت برنامه</a>
<p class="note">پس از دریافت، فایل را باز کنید و «نصب» را بزنید.</p>
</div><script>
function copyCode(){var c=document.getElementById('c');if(!c)return;try{navigator.clipboard.writeText(c.textContent)}catch(e){}
var n=document.getElementById('n');if(n)n.textContent='کد معرف کپی شد. با همین شماره وارد شوید.'}
</script></body></html>`
}

module.exports = { api, page, findOpenInvite }
