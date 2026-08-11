import RNFS from 'react-native-fs'
import { Buffer } from 'react-native-quick-crypto'
import type { DB } from '@op-engineering/op-sqlite'
import { getSchemaVersion } from '../database/migrationRunner'
import { createBackup, restoreBackup } from './backupFile'
import { createDatabaseSnapshot, restoreDatabaseSnapshot } from './databaseSnapshot'

export class RestoreSchemaTooNewError extends Error {
  constructor() {
    super(
      'This backup was created by a newer app version and uses a database schema this app cannot restore.'
    )
    this.name = 'RestoreSchemaTooNewError'
  }
}

/**
 * `MM-DD` would collide within a day across multiple backups; a full
 * timestamp keeps every file this produces uniquely named without the
 * caller having to think about it.
 */
function backupFileName(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `azar-backup-${stamp}.azarbackup`
}

/**
 * Builds a password-encrypted backup of the entire local database and
 * writes it to the app's cache directory (no storage permission needed
 * on any Android version — the file only needs to exist long enough for
 * the caller to save it via SAF (`saveDocuments`) or hand it to the
 * native share sheet (`react-native-share`), both of which read from this
 * path themselves). Returns the path so the caller can pass it to either.
 */
export async function createBackupFile(db: DB, password: string): Promise<string> {
  const snapshot = await createDatabaseSnapshot(db)
  const payload = new TextEncoder().encode(JSON.stringify(snapshot))
  const fileBytes = await createBackup(password, payload, snapshot.schemaVersion)

  const path = `${RNFS.CachesDirectoryPath}/${backupFileName()}`
  await RNFS.writeFile(path, Buffer.from(fileBytes).toString('base64'), 'base64')

  return path
}

/**
 * Decrypts and restores a backup file's contents into the live database,
 * following migration-strategy.md's checklist: `restoreBackup` itself
 * enforces the format-version window and authenticates the payload
 * (steps 1-3) before this function checks the payload's business-data
 * schema version against what this app currently supports (step 4) and
 * hands the validated snapshot to `restoreDatabaseSnapshot` (step 5 +
 * the atomic swap) — a newer, unrestorable schema is rejected here,
 * before any write to the live database.
 */
export async function restoreBackupFile(
  db: DB,
  password: string,
  fileBytes: Uint8Array
): Promise<void> {
  const restored = await restoreBackup(password, fileBytes)

  const currentSchemaVersion = await getSchemaVersion(db)
  if (restored.schemaVersion > currentSchemaVersion) {
    throw new RestoreSchemaTooNewError()
  }

  const snapshot: unknown = JSON.parse(new TextDecoder().decode(restored.payload))
  await restoreDatabaseSnapshot(db, snapshot)
}
