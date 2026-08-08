import { randomUUID } from 'react-native-quick-crypto'
import { generateRandomBytes } from '../security/aead'

export function generateId(): string {
  return randomUUID()
}

// Excludes visually ambiguous characters (0/O, 1/I/L) — a referral code
// is meant to be read aloud and typed by hand.
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const REFERRAL_CODE_LENGTH = 8

export function generateReferralCode(): string {
  const bytes = generateRandomBytes(REFERRAL_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length]
  }
  return code
}
