import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations, getSchemaVersion, MigrationError } from '../migrationRunner'

function openTestDatabase(): DB {
  const db = open({ name: `test-${Math.random()}.db`, location: ':memory:' })
  db.executeSync('PRAGMA foreign_keys = ON')
  return db
}

describe('migrationRunner', () => {
  let db: DB

  beforeEach(() => {
    db = openTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('starts a fresh database at schema version 0', async () => {
    expect(await getSchemaVersion(db)).toBe(0)
  })

  it('migrates a fresh database to the latest version', async () => {
    const result = await runMigrations(db)
    expect(result).toEqual({ from: 0, to: 7 })
    expect(await getSchemaVersion(db)).toBe(7)
  })

  it('creates every table declared in migration 0001', async () => {
    await runMigrations(db)
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    const tableNames = result.rows.map((row) => row.name)
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'users',
        'referral_relationships',
        'sessions',
        'locations',
        'amenities',
        'owner_files',
        'owner_file_amenities',
        'applicant_files',
        'requirement_criteria',
        'requirement_criterion_suppressions',
        'restrictions',
        'matches',
        'match_explanations',
        'reminder_schedules',
        'notes',
        'application_settings',
        'properties',
        'applicants',
        'deals',
        'reminders',
        'contracts'
      ])
    )
  })

  it('is idempotent — running migrations again against an up-to-date database is a no-op', async () => {
    await runMigrations(db)
    const second = await runMigrations(db)
    expect(second).toEqual({ from: 7, to: 7 })
  })

  it('enforces foreign key constraints once migrated', async () => {
    await runMigrations(db)
    await expect(
      db.execute(
        `INSERT INTO owner_files (id, user_id, full_name, phone_number, created_at, updated_at)
         VALUES ('owner-1', 'nonexistent-user', 'Test Owner', '0000000000', '2026-08-08', '2026-08-08')`
      )
    ).rejects.toThrow()
  })

  it('enforces the priority CHECK constraint on requirement_criteria', async () => {
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES ('user-1', '0000000000', 'REF001', '2026-08-08', '2026-08-08')`
    )
    await db.execute(
      `INSERT INTO applicant_files (id, user_id, full_name, phone_number, created_at, updated_at)
       VALUES ('applicant-1', 'user-1', 'Test Applicant', '0000000000', '2026-08-08', '2026-08-08')`
    )
    await expect(
      db.execute(
        `INSERT INTO requirement_criteria (id, applicant_file_id, target_field, priority, created_at, updated_at)
         VALUES ('crit-1', 'applicant-1', 'price', 'NOT_A_REAL_PRIORITY', '2026-08-08', '2026-08-08')`
      )
    ).rejects.toThrow()
  })

  it('rolls back the whole step if one statement in a migration fails, leaving version unchanged', async () => {
    // Re-running version 1's CREATE TABLE statements against an
    // already-migrated database must fail (tables already exist) without
    // corrupting the recorded schema version.
    await runMigrations(db)
    await expect(
      db.transaction(async (tx) => {
        await tx.execute('CREATE TABLE users (id TEXT)') // fails: already exists
        await tx.execute('PRAGMA user_version = 99')
      })
    ).rejects.toThrow()
    expect(await getSchemaVersion(db)).toBe(7)
  })

  it('seeds a bootstrap user so a fresh install has a valid referral code to register with', async () => {
    await runMigrations(db)
    const result = await db.execute('SELECT referral_code FROM users WHERE id = ?', [
      'bootstrap-seed-user'
    ])
    expect(result.rows[0]?.referral_code).toBe('AZARSEED')
  })

  it('exposes MigrationError with the failing version on a genuine migration failure', async () => {
    const badDb = openTestDatabase()
    // Poison the database so migration 0001 fails partway through.
    badDb.executeSync('CREATE TABLE users (id TEXT)')
    await expect(runMigrations(badDb)).rejects.toThrow(MigrationError)
    badDb.close()
  })
})
