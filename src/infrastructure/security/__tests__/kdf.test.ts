import { deriveKey, DEFAULT_KDF_PARAMS } from '../kdf'
import { generateRandomBytes } from '../aead'

// Small params for fast tests — production parameter values are
// unaffected (see DEFAULT_KDF_PARAMS in kdf.ts).
const FAST_PARAMS = { memoryKiB: 1024, iterations: 1, parallelism: 1, hashLengthBytes: 32 }

describe('kdf (Argon2id)', () => {
  it('derives a key of the requested length', async () => {
    const salt = generateRandomBytes(32)
    const key = await deriveKey('correct horse battery staple', salt, FAST_PARAMS)
    expect(key.length).toBe(FAST_PARAMS.hashLengthBytes)
  })

  it('is deterministic for the same password, salt, and params', async () => {
    const salt = generateRandomBytes(32)
    const first = await deriveKey('same-password', salt, FAST_PARAMS)
    const second = await deriveKey('same-password', salt, FAST_PARAMS)
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true)
  })

  it('produces a different key for a different password', async () => {
    const salt = generateRandomBytes(32)
    const first = await deriveKey('password-one', salt, FAST_PARAMS)
    const second = await deriveKey('password-two', salt, FAST_PARAMS)
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false)
  })

  it('produces a different key for a different salt', async () => {
    const first = await deriveKey('same-password', generateRandomBytes(32), FAST_PARAMS)
    const second = await deriveKey('same-password', generateRandomBytes(32), FAST_PARAMS)
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false)
  })

  it('exposes documented default parameters', () => {
    expect(DEFAULT_KDF_PARAMS.hashLengthBytes).toBe(32)
  })
})
