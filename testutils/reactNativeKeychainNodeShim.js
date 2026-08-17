/**
 * Jest-only stand-in for react-native-keychain (mapped in jest.config.js).
 * react-native-keychain has no Node binding at all — unlike op-sqlite and
 * (via the shim beside this file) quick-crypto, there is no real iOS
 * Keychain/Android Keystore to call under Jest. This in-memory fake
 * exists only so code that depends on the SecureStorage interface can be
 * exercised in tests; it does not itself verify anything about real
 * platform secure-storage behavior. See docs/implementation/phase-7-notes.md.
 */
const store = new Map()

module.exports = {
  async setGenericPassword(username, password, options) {
    store.set(options.service, { username, password })
    return { service: options.service, storage: 'test' }
  },
  async getGenericPassword(options) {
    const entry = store.get(options.service)
    return entry
      ? {
          username: entry.username,
          password: entry.password,
          service: options.service,
          storage: 'test'
        }
      : false
  },
  async resetGenericPassword(options) {
    return store.delete(options.service)
  }
}
