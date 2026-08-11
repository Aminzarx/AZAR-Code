import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations, getSchemaVersion, MigrationError } from '../migrationRunner'
import { migrations } from '../migrations'

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
    expect(result).toEqual({ from: 0, to: 15 })
    expect(await getSchemaVersion(db)).toBe(15)
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
        'contracts',
        'contacts',
        'contact_roles',
        'listings',
        'lost_reasons',
        'deal_stage_history',
        'activities',
        'audit_log'
      ])
    )
  })

  it('is idempotent — running migrations again against an up-to-date database is a no-op', async () => {
    await runMigrations(db)
    const second = await runMigrations(db)
    expect(second).toEqual({ from: 15, to: 15 })
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
    expect(await getSchemaVersion(db)).toBe(15)
  })

  it('seeds a bootstrap user so a fresh install has a valid referral code to register with', async () => {
    await runMigrations(db)
    const result = await db.execute('SELECT referral_code FROM users WHERE id = ?', [
      'bootstrap-seed-user'
    ])
    expect(result.rows[0]?.referral_code).toBe('AZARSEED')
  })

  it('seeds the 7 default lost reasons', async () => {
    await runMigrations(db)
    const result = await db.execute('SELECT id FROM lost_reasons WHERE is_system_default = 1')
    expect(result.rows.length).toBe(7)
  })

  it('enforces the contact_roles role CHECK constraint', async () => {
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES ('user-1', '0000000000', 'REF002', '2026-08-08', '2026-08-08')`
    )
    await db.execute(
      `INSERT INTO contacts (id, user_id, full_name, phone_number, created_at, updated_at)
       VALUES ('contact-1', 'user-1', 'Test Contact', '0000000000', '2026-08-08', '2026-08-08')`
    )
    await expect(
      db.execute(
        `INSERT INTO contact_roles (id, contact_id, role, created_at)
         VALUES ('role-1', 'contact-1', 'not_a_real_role', '2026-08-08')`
      )
    ).rejects.toThrow()
  })

  it('backfills deals.current_stage from the old status column for pre-existing rows', async () => {
    // Simulate an existing install upgrading from version 9 (pre-pipeline)
    // to latest: apply migrations up to 9 directly, insert a deal the old
    // way, then let runMigrations carry it through the rest.
    for (const migration of migrations.filter((m) => m.version <= 9)) {
      for (const statement of migration.statements) {
        await db.execute(statement)
      }
    }
    await db.execute(`PRAGMA user_version = 9`)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES ('user-1', '0000000000', 'REF003', '2026-08-08', '2026-08-08')`
    )
    await db.execute(
      `INSERT INTO properties (id, owner_id, title, city, address, created_at, updated_at)
       VALUES ('prop-1', 'user-1', 'Test Property', 'Tehran', 'Some address', '2026-08-08', '2026-08-08')`
    )
    await db.execute(
      `INSERT INTO applicants (id, user_id, full_name, phone_number, city, created_at, updated_at)
       VALUES ('app-1', 'user-1', 'Test Applicant', '0000000000', 'Tehran', '2026-08-08', '2026-08-08')`
    )
    await db.execute(
      `INSERT INTO deals (id, user_id, property_id, applicant_id, status, created_at, updated_at)
       VALUES ('deal-1', 'user-1', 'prop-1', 'app-1', 'completed', '2026-08-08', '2026-08-08')`
    )

    await runMigrations(db)

    const result = await db.execute('SELECT current_stage FROM deals WHERE id = ?', ['deal-1'])
    expect(result.rows[0]?.current_stage).toBe('won')
  })

  it('exposes MigrationError with the failing version on a genuine migration failure', async () => {
    const badDb = openTestDatabase()
    // Poison the database so migration 0001 fails partway through.
    badDb.executeSync('CREATE TABLE users (id TEXT)')
    await expect(runMigrations(badDb)).rejects.toThrow(MigrationError)
    badDb.close()
  })
})
