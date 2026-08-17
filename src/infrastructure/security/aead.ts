import { Buffer, createCipheriv, createDecipheriv, randomBytes } from 'react-native-quick-crypto'

const ALGORITHM = 'aes-256-gcm'
export const KEY_LENGTH_BYTES = 32
export const IV_LENGTH_BYTES = 12
export const AUTH_TAG_LENGTH_BYTES = 16

export type EncryptedPayload = {
  ciphertext: Uint8Array
  iv: Uint8Array
  authTag: Uint8Array
}

export function generateRandomBytes(length: number): Uint8Array {
  return new Uint8Array(randomBytes(length))
}

/**
 * AES-256-GCM encryption — the single AEAD cipher this project uses
 * (ADR-004's algorithm choice, kept as-is by ADR-012; only the
 * surrounding key hierarchy was simplified). A fresh random IV is
 * generated per call — never reused with the same key, per the original
 * design's explicit requirement.
 *
 * `aad` (additional authenticated data) is optional and lets a caller
 * bind unencrypted metadata — e.g. a backup file's header fields — to
 * the auth tag, so tampering with that metadata is also detected. This
 * is basic correct GCM usage, not extra hardening.
 */
export function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array
): EncryptedPayload {
  const iv = generateRandomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  if (aad) {
    cipher.setAAD(Buffer.from(aad))
  }
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
    authTag: new Uint8Array(authTag)
  }
}

/**
 * Decrypts and authenticates. Throws if the auth tag doesn't verify —
 * this is what distinguishes "wrong password" and "tampered/corrupted
 * file" from a successful restore; the caller is responsible for turning
 * that thrown error into the specific, distinct user-facing message
 * (that UX distinction is Phase 12's job, not this module's). `aad` must
 * match exactly what was passed to `encrypt`, or verification fails the
 * same as a tampered ciphertext.
 */
export function decrypt(key: Uint8Array, payload: EncryptedPayload, aad?: Uint8Array): Uint8Array {
  const decipher = createDecipheriv(ALGORITHM, key, payload.iv)
  if (aad) {
    decipher.setAAD(Buffer.from(aad))
  }
  decipher.setAuthTag(Buffer.from(payload.authTag))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext)),
    decipher.final()
  ])
  return new Uint8Array(decrypted)
}
