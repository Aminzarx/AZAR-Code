import { open, type DB } from '@op-engineering/op-sqlite'

const DATABASE_NAME = 'azar.db'

let instance: DB | null = null

/**
 * Opens (or returns the already-open) database connection.
 *
 * Phase 6 opens a plain, unencrypted database on purpose — SQLCipher
 * wrapping is Phase 7's job, sequenced after the schema exists and is
 * tested (docs/implementation/implementation-roadmap.md, Phase 6 vs
 * Phase 7). `encryptionKey` is the exact parameter Phase 7's secure-
 * storage wrapper will supply once a key exists; until then it is
 * omitted, and op-sqlite opens a plain database. Nothing about this
 * function's shape needs to change when that key is introduced — this
 * is the "integration point for future SQLCipher" the Phase 6 brief
 * asked to keep open. Foreign key enforcement is turned on immediately
 * after opening, per docs/local-data/local-data-architecture.md's
 * integrity requirement (SQLite has it off by default per connection).
 */
export function getDatabase(): DB {
  if (instance) {
    return instance
  }

  instance = open({ name: DATABASE_NAME })
  instance.executeSync('PRAGMA foreign_keys = ON')

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
