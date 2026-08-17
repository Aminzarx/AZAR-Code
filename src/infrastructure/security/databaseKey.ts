import { Buffer } from 'react-native-quick-crypto'
import { generateRandomBytes, KEY_LENGTH_BYTES } from './aead'
import type { SecureStorage } from './secureStorage'

const DATABASE_KEY_STORAGE_KEY = 'azar.database-key'

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex')
}

/**
 * Returns the local database's SQLCipher key, generating and persisting
 * a new random one on first launch. The key never leaves secure storage
 * except to be handed to op-sqlite's `open()` call.
 */
export async function getOrCreateDatabaseKey(storage: SecureStorage): Promise<string> {
  const existing = await storage.get(DATABASE_KEY_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const key = toHex(generateRandomBytes(KEY_LENGTH_BYTES))
  await storage.set(DATABASE_KEY_STORAGE_KEY, key)
  return key
}
