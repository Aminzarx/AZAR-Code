import {
  bytesToTokens,
  measureStorageUsage,
  roundTokens,
  STORAGE_TOKEN_ALLOWANCE,
  utf8Length
} from '../storageTokens'

describe('storage tokens (Amin #4164)', () => {
  it('counts 0.127 token per KB, with 1 MB = 1000 KB', () => {
    // Amin's own example: a file with 5 photos, 400 KB → 50.8 tokens
    expect(roundTokens(bytesToTokens(400_000))).toBe(50.8)
    // 50 MB → the whole allowance
    expect(bytesToTokens(50_000_000)).toBeCloseTo(STORAGE_TOKEN_ALLOWANCE)
  })

  it('shows at least 0.1 once anything is stored, and 0 when nothing is', () => {
    expect(roundTokens(0)).toBe(0)
    expect(roundTokens(0.004)).toBe(0.1)
  })

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
    expect(usage.allowance).toBe(6350)
  })
})
