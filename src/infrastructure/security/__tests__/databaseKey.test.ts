import { getOrCreateDatabaseKey } from '../databaseKey'
import { inMemorySecureStorage } from '../testHelpers'

describe('getOrCreateDatabaseKey', () => {
  it('generates a new key when none is stored', async () => {
    const storage = inMemorySecureStorage()
    const key = await getOrCreateDatabaseKey(storage)
    expect(key).toMatch(/^[0-9a-f]{64}$/) // 32 bytes, hex-encoded
  })

  it('persists the generated key for subsequent calls', async () => {
    const storage = inMemorySecureStorage()
    const first = await getOrCreateDatabaseKey(storage)
    const second = await getOrCreateDatabaseKey(storage)
    expect(second).toBe(first)
  })

  it('reuses a key that already exists in storage', async () => {
    const storage = inMemorySecureStorage()
    await storage.set('azar.database-key', 'preexisting-key-value')
    const key = await getOrCreateDatabaseKey(storage)
    expect(key).toBe('preexisting-key-value')
  })

  it('generates different keys across independent storages', async () => {
    const first = await getOrCreateDatabaseKey(inMemorySecureStorage())
    const second = await getOrCreateDatabaseKey(inMemorySecureStorage())
    expect(first).not.toBe(second)
  })
})
