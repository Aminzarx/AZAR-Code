import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { ApplicationSettingsRepository } from '../repositories/ApplicationSettingsRepository'

describe('ApplicationSettingsRepository', () => {
  let db: DB
  let repository: ApplicationSettingsRepository

  beforeEach(async () => {
    db = open({ name: `test-settings-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    repository = new ApplicationSettingsRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('returns null for a key that has never been set', async () => {
    expect(await repository.get('theme')).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    await repository.set('theme', 'dark')
    expect(await repository.get('theme')).toBe('dark')
  })

  it('overwrites an existing value on a second set', async () => {
    await repository.set('theme', 'dark')
    await repository.set('theme', 'light')
    expect(await repository.get('theme')).toBe('light')
  })

  it('deletes a stored value', async () => {
    await repository.set('theme', 'dark')
    await repository.delete('theme')
    expect(await repository.get('theme')).toBeNull()
  })
})
