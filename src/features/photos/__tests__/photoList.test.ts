import { open } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { measureStorageUsage } from '@features/settings/services/storageTokens'
import { movePhoto } from '../photoList'

describe('photo list (Amin #5062)', () => {
  it('moves a photo one place earlier or later, never past the ends', () => {
    expect(movePhoto(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(movePhoto(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(movePhoto(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(movePhoto(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })

  it('the storage card counts a waiting photo by its WebP size, not by the longer base64 text it travels in', async () => {
    const db = open({ name: `test-photo-tokens-${Math.random()}.db`, location: ':memory:' })
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES ('u1', '09120000000', 'REF00001', '2026-10-24', '2026-10-24')`
    )
    const before = await measureStorageUsage(db)
    const base64 = 'A'.repeat(400_000) // what 300,000 bytes of WebP look like in base64
    await db.execute(
      `INSERT INTO photos (id, user_id, subject_type, subject_id, position, data, bytes, width, height, created_at, updated_at)
       VALUES ('ph1', 'u1', 'property', 'p1', 0, ?, 300000, 1600, 1200, '2026-10-24', '2026-10-24')`,
      [base64]
    )
    const after = await measureStorageUsage(db)
    const added = after.bytes - before.bytes
    expect(added).toBeGreaterThanOrEqual(300_000)
    expect(added).toBeLessThan(300_400)
    db.close()
  })
})
