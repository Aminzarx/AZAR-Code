const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateReferralCode, generateSessionToken } = require('./ids')

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/

// Fixed by explicit product decision until a real SMS panel exists —
// remove this constant (and go back to accepting anything) once that
// panel is wired up and OTP delivery is genuinely enabled.
const FIXED_OTP_CODE = '555555'

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

// OTP delivery is disabled by product decision: no SMS is ever sent, and
// verify-otp requires the fixed FIXED_OTP_CODE instead of a real one. This
// endpoint just upserts an unverified "requested" row so the existing
// two-step screen flow (request -> enter code) still has server-side state
// afterward, exactly like the OTP-enabled flow will once a provider is
// wired up (ADR-003) — but verify-otp itself no longer depends on this
// having run first (see its own comment).
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

// OTP verification is fully disabled by explicit product decision (not just
// the code — the whole send-otp-first / expiry gate too): any phone number
// on any device is accepted with the fixed FIXED_OTP_CODE, whether or not
// send-otp was ever called for it first. This upserts a verified
// otp_requests row unconditionally so register/login's `otpState?.verified`
// check downstream still finds one, without depending on prior state.
router.post('/verify-otp', otpLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
  const code = typeof req.body?.code === 'string' ? req.body.code : ''

  if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    return fail(res, 422, 'invalid_phone_number', 'Enter a valid phone number.')
  }
  if (code !== FIXED_OTP_CODE) {
    return fail(res, 422, 'invalid_otp', 'That code is incorrect.')
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO otp_requests (phone_number, verified, requested_at, verified_at)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(phone_number) DO UPDATE SET verified = 1, verified_at = excluded.verified_at`
  ).run(phoneNumber, now, now)
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
