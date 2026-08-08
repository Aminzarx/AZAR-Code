import { open, type DB } from '@op-engineering/op-sqlite'
import { getOrCreateDatabaseKey } from '../security/databaseKey'
import { keychainSecureStorage } from '../security/keychainSecureStorage'
import { runMigrations } from './migrationRunner'

const DATABASE_NAME = 'azar.db'

let instance: DB | null = null

/**
 * Opens (or returns the already-open) database connection, encrypted via
 * SQLCipher (op-sqlite's `sqlcipher: true` build, package.json). The key
 * is generated on first launch and held exclusively in platform secure
 * storage (`getOrCreateDatabaseKey`) — never written to disk in plain
 * form. Foreign key enforcement is turned on immediately after opening,
 * per docs/local-data/local-data-architecture.md's integrity requirement
 * (SQLite has it off by default per connection). Migrations run here too
 * — this is the one place every caller goes through before touching the
 * database, so it is the only place that can guarantee the schema is
 * up to date before any repository query runs against it.
 */
export async function getDatabase(): Promise<DB> {
  if (instance) {
    return instance
  }

  const encryptionKey = await getOrCreateDatabaseKey(keychainSecureStorage)
  const db = open({ name: DATABASE_NAME, encryptionKey })
  db.executeSync('PRAGMA foreign_keys = ON')
  await runMigrations(db)
  instance = db

  return instance
}

/**
 * Closes the connection and clears the cached instance. Primarily for
 * test teardown; the running app keeps a single connection open for its
 * lifetime.
 */
export function closeDatabase(): void {
  instance?.close()
  instance = null
}
