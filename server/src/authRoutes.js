const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateReferralCode, generateSessionToken } = require('./ids')

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/
const OTP_REQUEST_EXPIRY_MS = 15 * 60 * 1000

const router = express.Router()

// Per-route limits, not global — matches ADR-009's "every one of these five
// operations must be individually rate-limited" instruction.
const otpLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })
const registerLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })

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

// OTP delivery is disabled by product decision: no SMS is ever sent, and
// verify-otp accepts any non-empty code. This endpoint only records that a
// code was "requested" for this phone number, so the existing two-step
// screen flow (request -> enter code) still has server-side state to check
// against, exactly like the OTP-enabled flow will once a provider is wired
// up (ADR-003).
router.post('/send-otp', otpLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    return fail(res, 422, 'invalid_phone_number', 'Enter a valid phone number.')
  }
  db.prepare(
    `INSERT INTO otp_requests (phone_number, verified, requested_at, verified_at)
     VALUES (?, 0, ?, NULL)
     ON CONFLICT(phone_number) DO UPDATE SET verified = 0, requested_at = excluded.requested_at, verified_at = NULL`
  ).run(phoneNumber, new Date().toISOString())
  res.status(204).end()
})

router.post('/verify-otp', otpLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const code = typeof req.body?.code === 'string' ? req.body.code : ''

  const state = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!state) {
    return fail(res, 422, 'invalid_otp', 'Request a new verification code first.')
  }
  if (Date.now() - new Date(state.requested_at).getTime() > OTP_REQUEST_EXPIRY_MS) {
    return fail(res, 422, 'otp_expired', 'This code has expired. Request a new one.')
  }
  if (code.length === 0) {
    return fail(res, 422, 'invalid_otp', 'That code is incorrect.')
  }

  db.prepare('UPDATE otp_requests SET verified = 1, verified_at = ? WHERE phone_number = ?').run(
    new Date().toISOString(),
    phoneNumber
  )
  res.status(204).end()
})

router.post('/register', registerLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const referralCode = typeof req.body?.referralCode === 'string' ? req.body.referralCode : ''

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(res, 401, 'authentication_required', 'Verify your phone number before registering.')
  }

  const referrer = findUserByReferralCode(referralCode)
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
    return fail(res, 422, 'phone_already_registered', 'This phone number is already registered. Log in instead.')
  }

  const user = {
    id: generateId(),
    phone_number: phoneNumber,
    referral_code: uniqueReferralCode(),
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
      'INSERT INTO users (id, phone_number, referral_code, created_at) VALUES (?, ?, ?, ?)'
    ).run(user.id, user.phone_number, user.referral_code, user.created_at)
    // Immutable by construction (ADR-009's referral reuse policy): no
    // update/delete statement for this table exists anywhere in this file.
    db.prepare(
      'INSERT INTO referral_relationships (id, referrer_user_id, referred_user_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(relationship.id, relationship.referrer_user_id, relationship.referred_user_id, relationship.created_at)
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

module.exports = router
