const crypto = require('node:crypto')

// Same alphabet/length as the client's generateReferralCode (idGenerators.ts)
// so codes minted by either side look identical to the referrer reading one
// aloud — excludes visually ambiguous characters (0/O, 1/I/L).
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const REFERRAL_CODE_LENGTH = 8

function generateId() {
  return crypto.randomUUID()
}

function generateReferralCode() {
  const bytes = crypto.randomBytes(REFERRAL_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length]
  }
  return code
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

module.exports = { generateId, generateReferralCode, generateSessionToken }
