import type { DB } from '@op-engineering/op-sqlite'
import { getSchemaVersion } from '../database/migrationRunner'

export type DatabaseSnapshot = {
  schemaVersion: number
  tables: Record<string, Array<Record<string, unknown>>>
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
