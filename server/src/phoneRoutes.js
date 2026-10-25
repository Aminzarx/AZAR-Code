const express = require('express')
const rateLimit = require('express-rate-limit')
const db = require('./db')
const { generateId } = require('./ids')
const tokens = require('./tokens')

// KSS (Amin #4632, v1.5.0): «تغییر شماره». The user proves the new number with
// the usual code (send-otp + verify-otp on the NEW number), then this moves the
// account to it: the user id, referral code and everything tied to them stay;
// the change is kept in phone_changes; every other session of the account ends.
// From then on the old number cannot sign in (authRoutes answers phone_moved)
// unless it is later given to an account again.
// Amin #5052: a number change costs tokens (kss-pricing app.eyvan_phone_change_tokens), spent in the same transaction
// as the move. While that number is empty the change is off (phone_change_off); a short balance refuses it.

const IRAN_MOBILE = /^\+989\d{9}$/

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/** True when `phoneNumber` was moved away from an account and no account holds it now. */
function isMovedNumber(phoneNumber) {
  if (db.prepare('SELECT 1 FROM users WHERE phone_number = ?').get(phoneNumber)) return false
  return !!db.prepare('SELECT 1 FROM phone_changes WHERE old_phone = ?').get(phoneNumber)
}

const router = express.Router()

// POST /auth/change-phone { sessionToken, newPhoneNumber } → { phoneNumber }
router.post('/change-phone', limiter, async (req, res, next) => {
  try {
  const sessionToken = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : ''
  const newPhone = typeof req.body?.newPhoneNumber === 'string' ? req.body.newPhoneNumber : ''

  const session = sessionToken ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(sessionToken) : null
  const user = session ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) : null
  if (!user) {
    return fail(res, 401, 'authentication_required', 'Sign in again to change the number.')
  }
  if (!IRAN_MOBILE.test(newPhone)) {
    return fail(res, 422, 'invalid_phone_number', 'Enter a valid Iranian mobile number.')
  }
  if (newPhone === user.phone_number) {
    return fail(res, 422, 'same_phone_number', 'This is already your number.')
  }
  if (db.prepare('SELECT 1 FROM users WHERE phone_number = ?').get(newPhone)) {
    return fail(res, 422, 'phone_already_registered', 'This number already uses the app.')
  }
  const otp = db.prepare('SELECT * FROM otp_requests WHERE phone_number = ?').get(newPhone)
  if (!otp?.verified) {
    return fail(res, 401, 'otp_required', 'Confirm the new number with its code first.')
  }

  const s = await tokens.settings()
  const cost = s?.phoneChangeTokens
  if (!s || cost == null) {
    return fail(res, 403, 'phone_change_off', 'Changing the number is not available yet.')
  }

  const at = new Date().toISOString()
  const changeId = generateId()
  try {
  db.transaction(() => {
    tokens.ensureOpening(user.id, s, tokens.storeOf(user.id))
    const balance = tokens.balanceOf(user.id, s)
    if (balance < cost) throw new tokens.TokensShortError(balance, cost)
    tokens.post(user.id, 'phone_change', -cost, `phone-change:${changeId}`, changeId, at)
    db.prepare(
      'INSERT INTO phone_changes (id, user_id, old_phone, new_phone, changed_at) VALUES (?, ?, ?, ?, ?)'
    ).run(changeId, user.id, user.phone_number, newPhone, at)
    db.prepare('UPDATE users SET phone_number = ? WHERE id = ?').run(newPhone, user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(user.id, sessionToken)
    db.prepare('DELETE FROM otp_requests WHERE phone_number IN (?, ?)').run(newPhone, user.phone_number)
    db.prepare('DELETE FROM invites WHERE phone_number = ? AND used_at IS NULL').run(newPhone)
  })()
  } catch (error) {
    if (error instanceof tokens.TokensShortError) {
      return fail(res, 422, 'tokens_short', 'Not enough tokens to change the number.')
    }
    throw error
  }

  res.status(200).json({ phoneNumber: newPhone, tokensSpent: cost })
  } catch (error) {
    next(error)
  }
})

// GET /auth/support → where «راهنما و پشتیبانی» sends people (Amin #4632). Set in the
// service's environment file, so contacts change with no new app:
//   AZAR_SUPPORT_WHATSAPP  = mobile in international form without +, e.g. 98912…
//   AZAR_SUPPORT_TELEGRAM  = Telegram username without @
//   AZAR_SUPPORT_RUBIKA    = Rubika bot id without @
// Every message opens with AZAR_SUPPORT_PREFIX so the company's IRIS can label it.
router.get('/support', (_req, res) => {
  const clean = (value) => String(value || '').trim().replace(/^[@+]/, '')
  res.set('Cache-Control', 'no-cache')
  res.json({
    prefix: process.env.AZAR_SUPPORT_PREFIX || 'پشتیبانی اپلیکیشن ایوان',
    whatsapp: /^\d{10,15}$/.test(clean(process.env.AZAR_SUPPORT_WHATSAPP)) ? clean(process.env.AZAR_SUPPORT_WHATSAPP) : null,
    telegram: /^[A-Za-z0-9_]{4,32}$/.test(clean(process.env.AZAR_SUPPORT_TELEGRAM)) ? clean(process.env.AZAR_SUPPORT_TELEGRAM) : null,
    rubika: /^[A-Za-z0-9_]{3,32}$/.test(clean(process.env.AZAR_SUPPORT_RUBIKA)) ? clean(process.env.AZAR_SUPPORT_RUBIKA) : null
  })
})

module.exports = { router, isMovedNumber }
