import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { UserRepository } from '../../database/repositories/UserRepository'
import {
  createDatabaseSnapshot,
  restoreDatabaseSnapshot,
  SnapshotFormatError
} from '../databaseSnapshot'

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

describe('restoreDatabaseSnapshot', () => {
  let db: DB

  beforeEach(async () => {
    db = open({ name: `test-restore-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('replaces existing rows with the snapshot, table by table', async () => {
    const userRepository = new UserRepository(db)
    await userRepository.create({
      id: 'old-user',
      phoneNumber: '+989120000000',
      referralCode: 'OLDCODE1'
    })

    const snapshot = await createDatabaseSnapshot(db)
    snapshot.tables.users = [
      {
        id: 'new-user',
        phone_number: '+989121234567',
        referral_code: 'NEWCODE1',
        used_referral_code: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z'
      }
    ]

    await restoreDatabaseSnapshot(db, snapshot)

    expect(await userRepository.findById('old-user')).toBeNull()
    expect(await userRepository.findById('new-user')).toEqual(
      expect.objectContaining({ phoneNumber: '+989121234567', referralCode: 'NEWCODE1' })
    )
  })

  it('leaves the live database untouched when the snapshot fails referential integrity', async () => {
    const userRepository = new UserRepository(db)
    await userRepository.create({
      id: 'keeper',
      phoneNumber: '+989120000000',
      referralCode: 'KEEPCODE'
    })

    const snapshot = await createDatabaseSnapshot(db)
    // sessions.user_id references users(id) — pointing it at a user row
    // that will never exist trips a real FK constraint violation on
    // purpose, exercising the rollback-on-failure guarantee.
    snapshot.tables.sessions = [
      {
        id: 'dangling-session',
        user_id: 'no-such-user',
        created_at: '2026-01-01T00:00:00.000Z',
        expires_at: null,
        revoked_at: null
      }
    ]

    await expect(restoreDatabaseSnapshot(db, snapshot)).rejects.toThrow(SnapshotFormatError)

    expect(await userRepository.findById('keeper')).not.toBeNull()
  })

  it('skips columns the current schema no longer has and tables it no longer defines', async () => {
    const snapshot = await createDatabaseSnapshot(db)
    snapshot.tables.users = [
      {
        id: 'legacy-user',
        phone_number: '+989123334444',
        referral_code: 'LEGACY01',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        a_column_from_a_future_version_of_the_app: 'should be ignored, not crash'
      }
    ]
    snapshot.tables.a_table_that_no_longer_exists = [{ anything: 'ignored' }]

    await expect(restoreDatabaseSnapshot(db, snapshot)).resolves.toBeUndefined()

    const userRepository = new UserRepository(db)
    expect(await userRepository.findById('legacy-user')).toEqual(
      expect.objectContaining({ phoneNumber: '+989123334444' })
    )
  })

  it('rejects a payload that is not a recognized snapshot shape', async () => {
    await expect(restoreDatabaseSnapshot(db, { not: 'a snapshot' })).rejects.toThrow(
      SnapshotFormatError
    )
  })
})
