import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { LostReasonRepository } from '../repositories/LostReasonRepository'

describe('LostReasonRepository', () => {
  let db: DB
  let repository: LostReasonRepository

  beforeEach(async () => {
    db = open({ name: `test-lost-reasons-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    repository = new LostReasonRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('returns the 7 seeded default reasons', async () => {
    const reasons = await repository.getAll()
    expect(reasons).toHaveLength(7)
    expect(reasons.every((reason) => reason.isSystemDefault)).toBe(true)
  })

  it('gets a reason by id', async () => {
    const reason = await repository.getById('lost-reason-price-too-high')
    expect(reason?.label).toBe('قیمت بالا')
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })
})
