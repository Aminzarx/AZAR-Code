const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId, generateReferralCode, generateSessionToken } = require('./ids')
const { findOpenInvite } = require('./inviteRoutes')
const { isMovedNumber } = require('./phoneRoutes')

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/

// KSS (Amin #4117): the sign-in code is a real one-time code sent by SMS through KSS's Kavenegar account (the
// verify/lookup API with the «otp» template, as kssx.ir), replacing the fixed code. The code is kept only as a hash.
const sms = require('./sms')
// loaded on use: tokens.js reaches licenceRoutes, which is loaded after this file
const tokens = () => require('./tokens')
const OTP_TTL_MS = 3 * 60 * 1000 // a code is good for 3 minutes
const OTP_RESEND_MS = 60 * 1000 // a new code at most once a minute per number (sooner = the last code still stands)
const OTP_MAX_PER_HOUR = 5 // codes sent to one number per hour
const OTP_MAX_ATTEMPTS = 5 // wrong tries before the code is void
// KSS (Amin #4277): until the app's final approval no SMS is sent; every sign-in code is AZAR_FIXED_OTP_CODE (123456)
// from the service's environment file. The rest of the flow (expiry, wrong-try limit) is unchanged. Remove that line
// from the environment file to switch the real SMS code back on.
const FIXED_OTP_CODE = /^\d{6}$/.test(process.env.AZAR_FIXED_OTP_CODE || '') ? process.env.AZAR_FIXED_OTP_CODE : ''
// KSS (2026-10-25): with the real SMS on (#5189), KSS's own emulator tests sign in with numbers listed here
// (AZAR_TEST_OTP_NUMBERS=09xxxxxxxxx,…): no SMS goes to them and their code is 123456. Kept empty except during a test.
const TEST_OTP_CODE = '123456'

// The "mother" referral code — always valid for registration regardless of
// whether it's ever actually stored as a real user.referral_code, until
// explicitly told otherwise (also explicitly product-decided, unlike every
// other referral code which must resolve to a real user row). Deliberately
// 6 characters, two shorter than every generated code (8).
const MASTER_REFERRAL_CODE = 'AMINZX'

const { deleteAccountData } = require('./syncRoutes')

const router = express.Router()

/**
 * KSS (Amin #4311): a new account made from an SMS invite at sign-in —
 * the same rows /register writes (user + referral relationship), and the
 * invite marked used. Returns the new user row.
 */
function createUser(phoneNumber, referrer, usedReferralCode, inviteCode) {
  const user = {
    id: generateId(),
    phone_number: phoneNumber,
    referral_code: uniqueReferralCode(),
    used_referral_code: usedReferralCode,
    created_at: new Date().toISOString()
  }
  db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, phone_number, referral_code, used_referral_code, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, user.phone_number, user.referral_code, user.used_referral_code, user.created_at)
    db.prepare(
      'INSERT INTO referral_relationships (id, referrer_user_id, referred_user_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(generateId(), referrer.id, user.id, new Date().toISOString())
    db.prepare('UPDATE invites SET used_at = ? WHERE code = ?').run(new Date().toISOString(), inviteCode)
  })()
  return user
}

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

/** a deleted account's code stays reserved (never minted again) but no longer brings anyone in */
function findUserByReferralCode(referralCode) {
  return db.prepare('SELECT * FROM users WHERE referral_code = ? AND deleted_at IS NULL').get(referralCode)
}

// Amin #5344: a new member without a code can name the colleague who invited them by mobile number instead
function findUserByMobile(mobile) {
  const local = sms.iranMobile(mobile)
  if (!local) return null
  return db
    .prepare('SELECT * FROM users WHERE phone_number IN (?, ?) AND deleted_at IS NULL')
    .get('+98' + local.slice(1), local)
}

function referralCodeTaken(referralCode) {
  return !!db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(referralCode)
}

function uniqueReferralCode() {
  // Collisions are astronomically unlikely at this alphabet/length, but
  // the unique constraint is the actual guarantee — this loop just avoids
  // surfacing a 500 on the rare collision instead of silently trusting
  // randomness.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode()
    if (!referralCodeTaken(code)) {
      return code
    }
  }
  throw new Error('Could not mint a unique referral code after 5 attempts.')
}

router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''
    // Amin #5302: an Iranian mobile only, +989xxxxxxxxx or 09xxxxxxxxx (11 digits)
    const mobile = /^(\+989\d{9}|09\d{9})$/.test(phoneNumber) ? sms.iranMobile(phoneNumber) : null
    if (!mobile) {
      return fail(res, 422, 'invalid_phone_number', 'Enter a valid phone number.')
    }
    const fixed = FIXED_OTP_CODE || (sms.isTestNumber(mobile) ? TEST_OTP_CODE : '')
    const now = Date.now()
    const row = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
    if (row?.code_hash && row.sent_at && now - Date.parse(row.sent_at) < OTP_RESEND_MS && Date.parse(row.expires_at) > now) {
      return res.status(204).end() // the code sent a moment ago still stands
    }
    const sameWindow = !!row?.window_start && now - Date.parse(row.window_start) < 60 * 60 * 1000
    const windowStart = sameWindow ? row.window_start : new Date(now).toISOString()
    const sentInWindow = sameWindow ? row.sent_count || 0 : 0
    if (!fixed && sentInWindow >= OTP_MAX_PER_HOUR) {
      return fail(res, 429, 'too_many_codes', 'Too many codes for this number; try again later.')
    }
    if (!fixed && !sms.ready()) {
      return fail(res, 503, 'sms_unavailable', 'Codes cannot be sent right now.')
    }
    const code = fixed || sms.newCode()
    if (!fixed) {
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
  // the code field may hold the inviter's mobile instead (Amin #5344); digits only, Persian/Arabic ones allowed
  const asDigits = rawReferralCode.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const inviterMobile = /^\+?[\d\s-]{10,14}$/.test(asDigits.trim()) ? sms.iranMobile(asDigits) : null

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(res, 401, 'authentication_required', 'Verify your phone number before registering.')
  }

  // The mother code always resolves to the bootstrap account as referrer,
  // regardless of that account's own actual referral_code — see
  // MASTER_REFERRAL_CODE's own comment.
  const referrer = inviterMobile
    ? findUserByMobile(inviterMobile)
    : referralCode === MASTER_REFERRAL_CODE
      ? db.prepare('SELECT * FROM users WHERE id = ?').get('bootstrap-seed-user')
      : findUserByReferralCode(referralCode)
  if (!referrer) {
    if (inviterMobile) {
      return fail(res, 422, 'invalid_inviter_phone', 'No member with this mobile number was found.')
    }
    return fail(res, 422, 'invalid_referral_code', 'This referral code was not found.')
  }
  // Checked before the duplicate-phone check: a referral code resolving to
  // the registering phone's own existing account is self-referral, and
  // must surface as that specific error (ADR-009), not "already registered".
  if (referrer.phone_number === phoneNumber) {
    return fail(res, 422, 'self_referral', 'You cannot use your own referral code.')
  }
  if (isMovedNumber(phoneNumber)) {
    return fail(res, 422, 'phone_moved', 'This number was moved to another number.')
  }
  if (liveUserByPhone(phoneNumber)) {
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
    used_referral_code: inviterMobile ? referrer.referral_code : referralCode,
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
    // Amin #5369: signing up is a sign-in too («آخرین ورود» in sales management)
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(user.created_at, user.id)
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

  // Amin #5351: the inviter's gift as soon as this colleague is in
  tokens().referralSignedUp(user.id).catch(() => undefined)
  res.status(201).json({ userId: user.id, referralCode: user.referral_code, sessionToken })
})

router.post('/login', registerLimiter, (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber : ''

  const otpState = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(phoneNumber)
  if (!otpState?.verified) {
    return fail(res, 401, 'authentication_required', 'Verify your phone number before logging in.')
  }

  let user = liveUserByPhone(phoneNumber)
  if (!user && isMovedNumber(phoneNumber)) {
    // KSS (Amin #4632): the account moved to a new number; the old one no longer signs in
    return fail(res, 422, 'phone_moved', 'This number was moved to another number.')
  }
  if (!user) {
    // KSS (Amin #4311): a mobile someone invited by SMS signs up right here,
    // with the inviter as its referrer, instead of being asked for a code.
    const open = findOpenInvite(phoneNumber)
    if (!open) {
      return fail(res, 422, 'invalid_phone_number', 'No account found for this number.')
    }
    user = createUser(phoneNumber, open.referrer, open.referrer.referral_code, open.invite.code)
    tokens().referralSignedUp(user.id).catch(() => undefined)
  }

  // Amin #5197: an account a KSS admin locked does not sign in (a deleted one was cleared above, Amin #6179)
  if (user.admin_status === 'locked' || user.admin_status === 'deleted') {
    return fail(res, 403, 'account_locked', 'This account is locked. Contact support.')
  }

  const sessionToken = generateSessionToken()
  db.transaction(() => {
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id)
    // AZAR-SYNC-001 (Amin #4142 R5): the phone that signs in now is the account's only active phone;
    // the previous one is signed out and wipes its copy the next time it reaches the server
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
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

  // KSS (Amin #5045): the referral chain never breaks. The account becomes a tombstone: its number, sessions,
  // invites, number history, licence and files go; the users row (id, referral code, the code it used) and both
  // directions of referral_relationships stay. The number itself is free to sign up again as a new account.
  db.transaction(() => {
    tombstone(user)
    db.prepare('DELETE FROM otp_requests WHERE phone_number = ?').run(phoneNumber)
  })()

  res.status(204).end()
})

/** what a tombstone holds instead of a number: unique, and never a valid phone number (so never signs in) */
function deletedMarker(userId) {
  return `deleted:${userId}`
}

/** the account becomes a tombstone (see delete-account); the caller wraps it in a transaction */
function tombstone(user) {
  db.prepare('UPDATE users SET phone_number = ?, deleted_at = ? WHERE id = ?').run(deletedMarker(user.id), new Date().toISOString(), user.id)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  db.prepare('DELETE FROM invites WHERE referrer_user_id = ?').run(user.id)
  db.prepare('DELETE FROM phone_changes WHERE user_id = ?').run(user.id)
  db.prepare('DELETE FROM licences WHERE user_id = ?').run(user.id)
  deleteAccountData(user.id)
}

/**
 * Amin #6179: an account a KSS admin deleted (soft, restorable for 30 days) keeps its number until the nightly purge,
 * so the person could not come back: the code was accepted, then sign-in was refused. When that number signs in or
 * signs up again, the deleted account becomes a tombstone right then (as the purge would) and the number starts over
 * as a new account. Locked accounts stay refused. Returns the user, or null when it was a deleted one.
 */
function liveUserByPhone(phoneNumber) {
  const user = findUserByPhone(phoneNumber)
  if (user?.admin_status !== 'deleted') return user ?? null
  db.transaction(() => tombstone(user))()
  console.info('[auth] deleted account', user.id, 'purged early: its number signs up again')
  return null
}

module.exports = router
