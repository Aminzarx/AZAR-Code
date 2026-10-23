const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateReferralCode, generateSessionToken } = require('./ids')

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/

// KSS (Amin #4117): the sign-in code is a real one-time code sent by SMS through KSS's Kavenegar account (the
// verify/lookup API with the «otp» template, as kssx.ir), replacing the fixed code. The code is kept only as a hash.
const sms = require('./sms')
const OTP_TTL_MS = 3 * 60 * 1000 // a code is good for 3 minutes
const OTP_RESEND_MS = 60 * 1000 // a new code at most once a minute per number (sooner = the last code still stands)
const OTP_MAX_PER_HOUR = 5 // codes sent to one number per hour
const OTP_MAX_ATTEMPTS = 5 // wrong tries before the code is void
// KSS (Amin #4277): until the app's final approval no SMS is sent; every sign-in code is AZAR_FIXED_OTP_CODE (123456)
// from the service's environment file. The rest of the flow (expiry, wrong-try limit) is unchanged. Remove that line
// from the environment file to switch the real SMS code back on.
const FIXED_OTP_CODE = /^\d{6}$/.test(process.env.AZAR_FIXED_OTP_CODE || '') ? process.env.AZAR_FIXED_OTP_CODE : ''

// The "mother" referral code — always valid for registration regardless of
// whether it's ever actually stored as a real user.referral_code, until
// explicitly told otherwise (also explicitly product-decided, unlike every
// other referral code which must resolve to a real user row). Deliberately
// 6 characters, two shorter than every generated code (8).
const MASTER_REFERRAL_CODE = 'AMINZX'

const router = express.Router()

// Per-route limits, not global — matches ADR-009's "every one of these five
// operations must be individually rate-limited" instruction.
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
})
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
})

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

function findUserByPhone(phoneNumber) {
  return db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber)
}

function findUserByReferralCode(referralCode) {
  return db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referralCode)
}

function uniqueReferralCode() {
  // Collisions are astronomically unlikely at this alphabet/length, but
  // the unique constraint is the actual guarantee — this loop just avoids
  // surfacing a 500 on the rare collision instead of silently trusting
  // randomness.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode()
    if (!findUserByReferralCode(code)) {
      return code
    }
  }
  throw new Error('Could not mint a unique referral code after 5 attempts.')
}

router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
    const mobile = PHONE_NUMBER_PATTERN.test(phoneNumber) ? sms.iranMobile(phoneNumber) : null
    if (!mobile) {
      return fail(res, 422, 'invalid_phone_number', 'Enter a valid phone number.')
    }
    const now = Date.now()
    const row = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
    if (row?.code_hash && row.sent_at && now - Date.parse(row.sent_at) < OTP_RESEND_MS && Date.parse(row.expires_at) > now) {
      return res.status(204).end() // the code sent a moment ago still stands
    }
    const sameWindow = !!row?.window_start && now - Date.parse(row.window_start) < 60 * 60 * 1000
    const windowStart = sameWindow ? row.window_start : new Date(now).toISOString()
    const sentInWindow = sameWindow ? row.sent_count || 0 : 0
    if (!FIXED_OTP_CODE && sentInWindow >= OTP_MAX_PER_HOUR) {
      return fail(res, 429, 'too_many_codes', 'Too many codes for this number; try again later.')
    }
    if (!FIXED_OTP_CODE && !sms.ready()) {
      return fail(res, 503, 'sms_unavailable', 'Codes cannot be sent right now.')
    }
    const code = FIXED_OTP_CODE || sms.newCode()
    if (!FIXED_OTP_CODE) {
      await sms.sendCode(mobile, code) // throws when Kavenegar refuses: nothing is stored then
    }
    const at = new Date(now).toISOString()
    db.prepare(
      `INSERT INTO otp_requests (phone_number, verified, requested_at, verified_at, code_hash, expires_at, attempts, sent_at, sent_count, window_start)
       VALUES (?, 0, ?, NULL, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(phone_number) DO UPDATE SET verified = 0, requested_at = excluded.requested_at, verified_at = NULL,
         code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = excluded.sent_at,
         sent_count = excluded.sent_count, window_start = excluded.window_start`
    ).run(phoneNumber, at, sms.hashCode(phoneNumber, code), new Date(now + OTP_TTL_MS).toISOString(), at, sentInWindow + 1, windowStart)
    res.status(204).end()
  } catch (err) {
    console.error('[send-otp]', err.message)
    fail(res, 503, 'sms_unavailable', 'Codes cannot be sent right now.')
  }
})

router.post('/verify-otp', otpLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''

  if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    return fail(res, 422, 'invalid_phone_number', 'Enter a valid phone number.')
  }
  const row = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!row?.code_hash || (row.attempts || 0) >= OTP_MAX_ATTEMPTS || !(Date.parse(row.expires_at) > Date.now())) {
    return fail(res, 422, 'otp_expired', 'This code has expired. Request a new one.')
  }
  if (!sms.sameCode(row.code_hash, sms.hashCode(phoneNumber, code))) {
    db.prepare('UPDATE otp_requests SET attempts = attempts + 1 WHERE phone_number = ?').run(phoneNumber)
    return fail(res, 422, 'invalid_otp', 'That code is incorrect.')
  }
  db.prepare(
    'UPDATE otp_requests SET verified = 1, verified_at = ?, code_hash = NULL, expires_at = NULL WHERE phone_number = ?'
  ).run(new Date().toISOString(), phoneNumber)
  res.status(204).end()
})

router.post('/register', registerLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const rawReferralCode = typeof req.body?.referralCode === 'string' ? req.body.referralCode : ''
  const referralCode = rawReferralCode.trim().toUpperCase()

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(res, 401, 'authentication_required', 'Verify your phone number before registering.')
  }

  // The mother code always resolves to the bootstrap account as referrer,
  // regardless of that account's own actual referral_code — see
  // MASTER_REFERRAL_CODE's own comment.
  const referrer =
    referralCode === MASTER_REFERRAL_CODE
      ? db.prepare('SELECT * FROM users WHERE id = ?').get('bootstrap-seed-user')
      : findUserByReferralCode(referralCode)
  if (!referrer) {
    return fail(res, 422, 'invalid_referral_code', 'This referral code was not found.')
  }
  // Checked before the duplicate-phone check: a referral code resolving to
  // the registering phone's own existing account is self-referral, and
  // must surface as that specific error (ADR-009), not "already registered".
  if (referrer.phone_number === phoneNumber) {
    return fail(res, 422, 'self_referral', 'You cannot use your own referral code.')
  }
  if (findUserByPhone(phoneNumber)) {
    return fail(
      res,
      422,
      'phone_already_registered',
      'This phone number is already registered. Log in instead.'
    )
  }

  const user = {
    id: generateId(),
    phone_number: phoneNumber,
    referral_code: uniqueReferralCode(),
    // Recorded alongside the phone number by explicit product request —
    // the code actually typed at registration (AMINZX or a real user's own
    // code), not the new code minted for this account above.
    used_referral_code: referralCode,
    created_at: new Date().toISOString()
  }

  const relationship = {
    id: generateId(),
    referrer_user_id: referrer.id,
    referred_user_id: user.id,
    created_at: new Date().toISOString()
  }

  const sessionToken = generateSessionToken()

  db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, phone_number, referral_code, used_referral_code, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, user.phone_number, user.referral_code, user.used_referral_code, user.created_at)
    // Immutable by construction (ADR-009's referral reuse policy): no
    // update/delete statement for this table exists anywhere in this file.
    db.prepare(
      'INSERT INTO referral_relationships (id, referrer_user_id, referred_user_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      relationship.id,
      relationship.referrer_user_id,
      relationship.referred_user_id,
      relationship.created_at
    )
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
      sessionToken,
      user.id,
      new Date().toISOString()
    )
    db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  })()

  res.status(201).json({ userId: user.id, referralCode: user.referral_code, sessionToken })
})

router.post('/login', registerLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(res, 401, 'authentication_required', 'Verify your phone number before logging in.')
  }

  const user = findUserByPhone(phoneNumber)
  if (!user) {
    return fail(res, 422, 'invalid_phone_number', 'No account found for this number.')
  }

  const sessionToken = generateSessionToken()
  db.transaction(() => {
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
      sessionToken,
      user.id,
      new Date().toISOString()
    )
    db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  })()

  res.status(200).json({ userId: user.id, referralCode: user.referral_code, sessionToken })
})

// Requires the same fresh OTP-verified state as register/login — deleting
// an account is at least as sensitive as creating one, so it gets the same
// re-confirmation, not a bare "are you sure" tap.
router.post('/delete-account', registerLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(
      res,
      401,
      'authentication_required',
      'Verify your phone number before deleting your account.'
    )
  }

  const user = findUserByPhone(phoneNumber)
  if (!user) {
    return fail(res, 422, 'invalid_phone_number', 'No account found for this number.')
  }

  db.transaction(() => {
    // referral_relationships has no ON DELETE action on its user
    // references, so this account's referral trail (both as referrer and
    // as referred) has to go first, or the FK constraint blocks the user
    // row's own delete.
    db.prepare(
      'DELETE FROM referral_relationships WHERE referrer_user_id = ? OR referred_user_id = ?'
    ).run(user.id, user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id)
    db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  })()

  res.status(204).end()
})

module.exports = router
