import type { DB, Scalar } from '@op-engineering/op-sqlite'
import { getSchemaVersion } from '../database/migrationRunner'

export type DatabaseSnapshot = {
  schemaVersion: number
  tables: Record<string, Array<Record<string, unknown>>>
}

export class SnapshotFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotFormatError'
  }
}

/**
 * A full, plain (unencrypted at this layer — backupFile.ts encrypts the
 * serialized result) dump of every real table's rows, keyed by table
 * name. Enumerates tables from sqlite_master rather than a hardcoded
 * list so a new migration's table is included automatically, without
 * this module needing to change in step with every schema addition.
 */
export async function createDatabaseSnapshot(db: DB): Promise<DatabaseSnapshot> {
  const schemaVersion = await getSchemaVersion(db)

  const tableListResult = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  )

  const tables: Record<string, Array<Record<string, unknown>>> = {}
  for (const row of tableListResult.rows) {
    const name = row.name as string
    const result = await db.execute(`SELECT * FROM "${name}"`)
    tables[name] = result.rows
  }

  return { schemaVersion, tables }
}

/**
 * `PRAGMA` query results come back through `rawRows`, not `rows`, on this
 * binding (migrationRunner.ts's `getSchemaVersion` hit the same thing for
 * `PRAGMA user_version` — verified directly against the Node binding, not
 * assumed). `executeRaw` is the reliable path for any PRAGMA that returns
 * rows; plain `execute` is only for regular DML/DQL.
 */
async function getTableColumns(db: DB, tableName: string): Promise<Set<string>> {
  const result = await db.executeRaw(`PRAGMA table_info("${tableName}")`)
  // pragma_table_info's column order is fixed by SQLite itself: (cid,
  // name, type, notnull, dflt_value, pk) — index 1 is always the name.
  return new Set(result.rawRows.map((row) => String(row[1])))
}

/**
 * The parent tables `tableName` has a foreign key pointing at (index 2 of
 * `pragma_foreign_key_list`'s fixed column order: id, seq, table, from,
 * to, on_update, on_delete, match).
 */
async function getForeignKeyParents(db: DB, tableName: string): Promise<Set<string>> {
  const result = await db.executeRaw(`PRAGMA foreign_key_list("${tableName}")`)
  return new Set(result.rawRows.map((row) => String(row[2])))
}

/**
 * Orders every live table so that a table always comes after every table
 * it has a foreign key pointing at (Kahn's algorithm) — the order rows
 * must be *inserted* in in `restoreDatabaseSnapshot`, since
 * `PRAGMA foreign_keys` stays ON throughout the restore (see that
 * function's comment for why) and an out-of-order insert would trip a
 * real constraint violation on a row that's actually fine. Deleting rows
 * uses this order reversed, for the same reason in the other direction.
 */
async function topologicallyOrderTables(db: DB, tableNames: Set<string>): Promise<string[]> {
  const parentsByTable = new Map<string, Set<string>>()
  for (const tableName of tableNames) {
    const parents = await getForeignKeyParents(db, tableName)
    // Only care about dependencies within the set of tables actually
    // being restored — a stray reference to a table that (defensively)
    // isn't in `tableNames` would otherwise stall the sort forever.
    for (const parent of [...parents]) {
      if (!tableNames.has(parent) || parent === tableName) {
        parents.delete(parent)
      }
    }
    parentsByTable.set(tableName, parents)
  }

  const ordered: string[] = []
  const remaining = new Set(tableNames)
  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) =>
      [...(parentsByTable.get(table) ?? [])].every((parent) => !remaining.has(parent))
    )
    if (ready.length === 0) {
      // A genuine cycle shouldn't exist in this app's schema (checked
      // against every migration at the time this was written), but
      // falling back to insertion order rather than looping forever is
      // the safe failure mode if one is ever introduced.
      ordered.push(...remaining)
      break
    }
    for (const table of ready.sort()) {
      ordered.push(table)
      remaining.delete(table)
    }
  }
  return ordered
}

/**
 * A snapshot's rows round-tripped through JSON (createDatabaseSnapshot ->
 * JSON.stringify -> encrypted -> decrypted -> JSON.parse), so every value
 * is already one of JSON's own types by construction; the only one not
 * directly assignable to op-sqlite's `Scalar` is a nested object/array,
 * which JSON-based sqlite columns don't produce in this app — stringified
 * defensively rather than assumed impossible.
 */
function toScalar(value: unknown): Scalar {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return JSON.stringify(value)
}

function isValidSnapshotShape(value: unknown): value is DatabaseSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return typeof candidate.schemaVersion === 'number' && typeof candidate.tables === 'object'
}

/**
 * Replaces the live database's rows with a decrypted backup's rows, table
 * by table. Per migration-strategy.md's "additive changes preferred"
 * schema-evolution principle, every migration so far only adds tables/
 * columns, so restoring an older snapshot's rows directly against the
 * current schema (skipping columns/tables that didn't exist yet at backup
 * time, leaving newer tables the snapshot never mentions untouched) is
 * equivalent to "migrating it forward" for this app's actual migration
 * history — there is no renamed/removed column anywhere in
 * infrastructure/database/migrations to require a real staged migration
 * engine. A future non-additive migration would need to revisit this.
 *
 * `PRAGMA foreign_keys` stays ON for the whole operation (unlike an
 * earlier version of this function, which turned it off): `PRAGMA
 * foreign_key_check`'s result can't be read reliably from inside a
 * transaction on this binding (only `executeRaw` returns PRAGMA rows
 * correctly, and the `Transaction` object op-sqlite hands to
 * `db.transaction`'s callback doesn't expose `executeRaw`). Leaving real
 * enforcement on and inserting tables in dependency order instead means
 * any actual inconsistency raises a genuine SQLite constraint error,
 * which the transaction wrapper already rolls back correctly (the same
 * guarantee migrationRunner.ts relies on for a failed migration step) —
 * so the live database still ends up untouched on failure, just via
 * SQLite's own enforcement instead of a manual post-check.
 */
export async function restoreDatabaseSnapshot(db: DB, snapshot: unknown): Promise<void> {
  if (!isValidSnapshotShape(snapshot)) {
    throw new SnapshotFormatError('Backup payload is not a recognized database snapshot.')
  }

  const liveTableListResult = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  )
  const liveTableNames = new Set(liveTableListResult.rows.map((row) => row.name as string))

  const columnsByTable = new Map<string, Set<string>>()
  for (const tableName of liveTableNames) {
    columnsByTable.set(tableName, await getTableColumns(db, tableName))
  }

  const insertOrder = await topologicallyOrderTables(db, liveTableNames)
  const deleteOrder = [...insertOrder].reverse()

  try {
    await db.transaction(async (tx) => {
      for (const tableName of deleteOrder) {
        if (tableName in snapshot.tables) {
          await tx.execute(`DELETE FROM "${tableName}"`)
        }
      }

      for (const tableName of insertOrder) {
        const rows = snapshot.tables[tableName]
        const validColumns = columnsByTable.get(tableName)
        if (!validColumns || !Array.isArray(rows)) {
          continue
        }

        for (const row of rows) {
          if (typeof row !== 'object' || row === null) {
            continue
          }
          const columns = Object.keys(row).filter((column) => validColumns.has(column))
          if (columns.length === 0) {
            continue
          }
          const placeholders = columns.map(() => '?').join(', ')
          const columnList = columns.map((column) => `"${column}"`).join(', ')
          const values: Scalar[] = columns.map((column) =>
            toScalar((row as Record<string, unknown>)[column])
          )
          await tx.execute(
            `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
            values
          )
        }
      }
    })
  } catch (error) {
    if (error instanceof SnapshotFormatError) {
      throw error
    }
    throw new SnapshotFormatError(
      'Restored data failed referential integrity checks — restore aborted.'
    )
  }
}
