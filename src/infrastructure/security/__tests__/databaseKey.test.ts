import { getOrCreateDatabaseKey } from '../databaseKey'
import type { SecureStorage } from '../secureStorage'

function inMemoryStorage(): SecureStorage {
  const store = new Map<string, string>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value) {
      store.set(key, value)
    }
  }
}

describe('getOrCreateDatabaseKey', () => {
  it('generates a new key when none is stored', async () => {
    const storage = inMemoryStorage()
    const key = await getOrCreateDatabaseKey(storage)
    expect(key).toMatch(/^[0-9a-f]{64}$/) // 32 bytes, hex-encoded
  })

  it('persists the generated key for subsequent calls', async () => {
    const storage = inMemoryStorage()
    const first = await getOrCreateDatabaseKey(storage)
    const second = await getOrCreateDatabaseKey(storage)
    expect(second).toBe(first)
  })

  it('reuses a key that already exists in storage', async () => {
    const storage = inMemoryStorage()
    await storage.set('azar.database-key', 'preexisting-key-value')
    const key = await getOrCreateDatabaseKey(storage)
    expect(key).toBe('preexisting-key-value')
  })

  it('generates different keys across independent storages', async () => {
    const first = await getOrCreateDatabaseKey(inMemoryStorage())
    const second = await getOrCreateDatabaseKey(inMemoryStorage())
    expect(first).not.toBe(second)
  })
})
