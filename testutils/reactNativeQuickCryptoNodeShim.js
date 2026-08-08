/* eslint-env node */
/**
 * Jest-only stand-in for react-native-quick-crypto (mapped in
 * jest.config.js). Same reasoning as op-sqlite's Node binding
 * (docs/implementation/phase-6-notes.md): no native binary exists under
 * Jest, and quick-crypto ships no Node build of its own (unlike
 * op-sqlite), so this shim provides real, standard-compliant
 * implementations of the exact functions this project's code imports —
 * Node's own `crypto` module for AES-256-GCM and random bytes (the two
 * are meant to be API-compatible by quick-crypto's own design), and the
 * `argon2` npm package (a different, independently audited native
 * Argon2 binding) for Argon2id, adapted to the same callback shape
 * quick-crypto's `argon2()` uses. See docs/implementation/phase-7-notes.md.
 */
const crypto = require('node:crypto')
const argon2 = require('argon2')

module.exports = {
  Buffer: Buffer,
  createCipheriv: crypto.createCipheriv,
  createDecipheriv: crypto.createDecipheriv,
  randomBytes: crypto.randomBytes,
  argon2: (algorithm, params, callback) => {
    argon2
      .hash(Buffer.from(params.message), {
        type: argon2.argon2id,
        salt: Buffer.from(params.nonce),
        memoryCost: params.memory,
        timeCost: params.passes,
        parallelism: params.parallelism,
        hashLength: params.tagLength,
        raw: true
      })
      .then((raw) => callback(null, raw))
      .catch((error) => callback(error))
  }
}
