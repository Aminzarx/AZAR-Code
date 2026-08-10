import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { UserRepository } from '../../database/repositories/UserRepository'
import { createDatabaseSnapshot } from '../databaseSnapshot'

describe('createDatabaseSnapshot', () => {
  let db: DB

  beforeEach(async () => {
    db = open({ name: `test-snapshot-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('captures the current schema version', async () => {
    const snapshot = await createDatabaseSnapshot(db)
    expect(snapshot.schemaVersion).toBeGreaterThan(0)
  })

  it('includes every real table, and no sqlite-internal ones', async () => {
    const snapshot = await createDatabaseSnapshot(db)
    expect(Object.keys(snapshot.tables)).toEqual(
      expect.arrayContaining(['users', 'properties', 'applicants'])
    )
    expect(Object.keys(snapshot.tables).some((name) => name.startsWith('sqlite_'))).toBe(false)
  })

  it('captures existing row data', async () => {
    const userRepository = new UserRepository(db)
    await userRepository.create({
      id: 'user-1',
      phoneNumber: '+989121234567',
      referralCode: 'ABCD1234'
    })

    const snapshot = await createDatabaseSnapshot(db)

    expect(snapshot.tables.users).toContainEqual(
      expect.objectContaining({ id: 'user-1', phone_number: '+989121234567' })
    )
  })
})
