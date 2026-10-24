import { ed25519 } from '@noble/curves/ed25519'
import { licenceIsOpen, readSignedLicence, type SignedLicence } from '../licenceToken'

const DAY = 24 * 60 * 60 * 1000
const secret = ed25519.utils.randomPrivateKey()
const publicHex = Buffer.from(ed25519.getPublicKey(secret)).toString('hex')

/** what server/src/licenceRoutes.js sends: base64url(JSON) + '.' + base64url(Ed25519 signature) */
function sign(payload: SignedLicence, key = secret): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${Buffer.from(ed25519.sign(Buffer.from(body), key)).toString('base64url')}`
}

describe('licence token (Amin #4906)', () => {
  const now = Date.parse('2026-10-24T12:00:00Z')
  const trial: SignedLicence = { u: 'user-1', st: 'trial', e: now + 7 * DAY, i: now }

  it('reads a licence the server signed', () => {
    expect(readSignedLicence(sign(trial), publicHex)).toEqual(trial)
  })

  it('refuses a licence whose end date was changed on the phone', () => {
    const [, signature] = sign(trial).split('.')
    const longer = Buffer.from(JSON.stringify({ ...trial, e: trial.e! + 365 * DAY })).toString('base64url')
    expect(readSignedLicence(`${longer}.${signature}`, publicHex)).toBeNull()
  })

  it('refuses a licence signed with any other key', () => {
    expect(readSignedLicence(sign(trial, ed25519.utils.randomPrivateKey()), publicHex)).toBeNull()
    expect(readSignedLicence('not-a-licence', publicHex)).toBeNull()
  })

  it('is open until the end date, offline too', () => {
    expect(licenceIsOpen(trial, now + 6 * DAY, 0)).toBe(true)
    expect(licenceIsOpen(trial, now + 7 * DAY, 0)).toBe(false)
  })

  it('turning the phone clock back does not reopen an ended licence', () => {
    expect(licenceIsOpen(trial, now + DAY, now + 8 * DAY)).toBe(false)
    expect(licenceIsOpen(trial, now - 30 * DAY, 0)).toBe(true) // before issue: the issue time counts
  })

  it('a free account never ends', () => {
    expect(licenceIsOpen({ u: 'user-1', st: 'free', e: null, i: now }, now + 999 * DAY, 0)).toBe(true)
  })
})
