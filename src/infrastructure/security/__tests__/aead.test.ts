import { decrypt, encrypt, generateRandomBytes, KEY_LENGTH_BYTES } from '../aead'

describe('aead (AES-256-GCM)', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const key = generateRandomBytes(KEY_LENGTH_BYTES)
    const plaintext = new TextEncoder().encode('AZAR local business data')

    const encrypted = encrypt(key, plaintext)
    const decrypted = decrypt(key, encrypted)

    expect(new TextDecoder().decode(decrypted)).toBe('AZAR local business data')
  })

  it('produces a different IV on every call', () => {
    const key = generateRandomBytes(KEY_LENGTH_BYTES)
    const plaintext = new TextEncoder().encode('same input')

    const first = encrypt(key, plaintext)
    const second = encrypt(key, plaintext)

    expect(Buffer.from(first.iv).equals(Buffer.from(second.iv))).toBe(false)
  })

  it('rejects decryption with the wrong key', () => {
    const key = generateRandomBytes(KEY_LENGTH_BYTES)
    const wrongKey = generateRandomBytes(KEY_LENGTH_BYTES)
    const encrypted = encrypt(key, new TextEncoder().encode('secret'))

    expect(() => decrypt(wrongKey, encrypted)).toThrow()
  })

  it('rejects a tampered ciphertext', () => {
    const key = generateRandomBytes(KEY_LENGTH_BYTES)
    const encrypted = encrypt(key, new TextEncoder().encode('secret'))
    const tampered = { ...encrypted, ciphertext: new Uint8Array(encrypted.ciphertext) }
    tampered.ciphertext[0] = (tampered.ciphertext[0] + 1) % 256

    expect(() => decrypt(key, tampered)).toThrow()
  })

  it('rejects a payload whose AAD does not match what was used to encrypt it', () => {
    const key = generateRandomBytes(KEY_LENGTH_BYTES)
    const aad = new TextEncoder().encode('header-fields')
    const wrongAad = new TextEncoder().encode('different-header-fields')
    const encrypted = encrypt(key, new TextEncoder().encode('secret'), aad)

    expect(() => decrypt(key, encrypted, wrongAad)).toThrow()
  })
})
