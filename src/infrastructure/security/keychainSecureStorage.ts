import * as Keychain from 'react-native-keychain'
import type { SecureStorage } from './secureStorage'

/**
 * Production SecureStorage backed by react-native-keychain (iOS Keychain
 * / Android Keystore). One credential per `key`, namespaced by `service`
 * so multiple secrets (database key, session token) don't collide.
 */
export const keychainSecureStorage: SecureStorage = {
  async get(key) {
    const result = await Keychain.getGenericPassword({ service: key })
    return result ? result.password : null
  },
  async set(key, value) {
    await Keychain.setGenericPassword(key, value, { service: key })
  },
  async delete(key) {
    await Keychain.resetGenericPassword({ service: key })
  }
}
