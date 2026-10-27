import { measureStorageUsage, utf8Length } from '../storageTokens'

describe('storage size (Amin #4164; tokens come from kss-pricing on the server, #5446)', () => {

  it('measures Persian text in UTF-8 bytes', () => {
    expect(utf8Length('abc')).toBe(3)
    expect(utf8Length('سلام')).toBe(8)
  })

  it('adds up the user tables and extra files, skipping tables an older database lacks', async () => {
    const db = {
      execute: jest.fn(async (sql: string) => {
        if (sql.includes('owner_files')) return { rows: [{ id: 'a', title: 'x' }] }
        if (sql.includes('notes')) throw new Error('no such table')
        return { rows: [] }
      })
    }
    const usage = await measureStorageUsage(db as never, 1000)
    expect(usage.bytes).toBe(1000 + JSON.stringify({ id: 'a', title: 'x' }).length)
  })
})
