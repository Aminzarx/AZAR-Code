import RNFS from 'react-native-fs'
import { Buffer } from 'react-native-quick-crypto'
import type { DB } from '@op-engineering/op-sqlite'
import { createBackup } from './backupFile'
import { createDatabaseSnapshot } from './databaseSnapshot'

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
 * the OS share sheet, opened by the caller, to hand it to wherever the
 * user actually wants it saved). Returns the path so the caller can pass
 * it straight to `Share.share`.
 */
export async function createBackupFile(db: DB, password: string): Promise<string> {
  const snapshot = await createDatabaseSnapshot(db)
  const payload = new TextEncoder().encode(JSON.stringify(snapshot))
  const fileBytes = await createBackup(password, payload, snapshot.schemaVersion)

  const path = `${RNFS.CachesDirectoryPath}/${backupFileName()}`
  await RNFS.writeFile(path, Buffer.from(fileBytes).toString('base64'), 'base64')

  return path
}
