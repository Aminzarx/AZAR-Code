import type { DB } from '@op-engineering/op-sqlite'
import { migrations } from './migrations'

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly failedVersion: number,
    readonly cause: unknown
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

/**
 * Reads the schema version SQLite itself stores (`PRAGMA user_version`),
 * per docs/architecture/migration-strategy.md — one version number serves
 * both the live database's migration path and backup compatibility
 * checking, so it lives in the database file itself, not a side table.
 *
 * Uses the raw-row query path rather than `execute`/`rows` — PRAGMA
 * queries return their value through `rawRows` on this binding, not the
 * usual `rows` array (verified directly against the Node binding; see
 * docs/implementation/phase-6-notes.md for the finding).
 */
export async function getSchemaVersion(db: DB): Promise<number> {
  const result = await db.executeRaw('PRAGMA user_version')
  const value = result.rawRows[0]?.[0]
  return typeof value === 'number' ? value : 0
}

/**
 * Runs every migration newer than the database's current version, each in
 * its own transaction (migration-strategy.md: "every migration runs
 * inside a single database transaction" — a failed step rolls back to the
 * prior valid state, never leaving a half-migrated database). Stops and
 * throws on the first failure rather than skipping ahead, per the same
 * document's "must never proceed to normal operation against a database
 * it cannot confirm is at a fully-migrated, known version."
 */
export async function runMigrations(db: DB): Promise<{ from: number; to: number }> {
  const from = await getSchemaVersion(db)

  const pending = migrations.filter((migration) => migration.version > from)

  let to = from
  for (const migration of pending) {
    try {
      await db.transaction(async (tx) => {
        for (const statement of migration.statements) {
          await tx.execute(statement)
        }
        await tx.execute(`PRAGMA user_version = ${migration.version}`)
      })
    } catch (error) {
      throw new MigrationError(
        `Migration to version ${migration.version} ("${migration.description}") failed`,
        migration.version,
        error
      )
    }
    to = migration.version
  }

  return { from, to }
}
