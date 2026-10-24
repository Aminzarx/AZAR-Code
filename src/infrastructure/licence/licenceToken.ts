import { ed25519 } from '@noble/curves/ed25519'

/**
 * Amin #4906: the licence the sign-in server signed (server/src/licenceRoutes.js), «payload.signature» in
 * base64url. Checked with the public key built into the app, so a phone can trust it offline until its end date
 * and nobody can lengthen it by editing what the phone stored.
 */
export const LICENCE_PUBLIC_KEY = '9063850052020bbf285f5fb1f0b7ae90f5f525042189d031320f939e0c0aeb97'

export type LicenceState = 'trial' | 'active' | 'free' | 'expired'

export type SignedLicence = {
  /** account id */
  u: string
  st: LicenceState
  /** end time (ms), null = no end (free) */
  e: number | null
  /** when the server issued it (ms) */
  i: number
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function fromBase64Url(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '')
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of clean) {
    const value = B64.indexOf(char)
    if (value < 0) throw new Error('bad base64url')
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
    }
  }
  return Uint8Array.from(out)
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

const ascii = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0))

/** The payload when the signature is the server's, otherwise null. */
export function readSignedLicence(signed: string, publicKeyHex = LICENCE_PUBLIC_KEY): SignedLicence | null {
  const [payload, signature] = signed.split('.')
  if (!payload || !signature) return null
  try {
    if (!ed25519.verify(fromBase64Url(signature), ascii(payload), hexToBytes(publicKeyHex))) return null
    const json = String.fromCharCode(...fromBase64Url(payload))
    const parsed = JSON.parse(decodeURIComponent(escape(json))) as SignedLicence
    return typeof parsed.u === 'string' && typeof parsed.st === 'string' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Whether the user may change anything at `now`. The clock the phone trusts never goes back: `seenAt` is the
 * latest time this phone has already seen, so turning the date back does not reopen an ended licence.
 */
export function licenceIsOpen(licence: SignedLicence, now: number, seenAt: number): boolean {
  if (licence.st === 'free') return true
  if (licence.e === null) return false
  return Math.max(now, seenAt, licence.i) < licence.e
}
