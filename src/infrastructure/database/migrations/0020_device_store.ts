import type { Migration } from '../types'
import { SYNCED_SETTING_KEYS } from './0019_server_sync'

/**
 * Amin #4826 (option A): the files are never kept on the phone. The working database lives in memory only; what
 * this phone itself must remember between launches — who is signed in, its own settings, the sync state — is
 * written through to the small encrypted device store (deviceStore.ts). Every change to those rows is noted
 * here by a trigger, the same way 0019 notes the file changes in `sync_outbox`.
 */
export const DEVICE_TABLES = {
  users: 'id',
  sessions: 'id',
  referral_relationships: 'id',
  application_settings: 'key',
  sync_state: 'key'
} as const

const NOT_APPLYING = `(SELECT value FROM sync_state WHERE key = 'applying') IS NOT '1'`
const profileKeys = SYNCED_SETTING_KEYS.map((k) => `'${k}'`).join(', ')

/** the profile keys of application_settings are the account's (they go to the server, 0019); `applying` is a flag */
function onlyDeviceRows(table: string, row: 'NEW' | 'OLD'): string {
  if (table === 'application_settings') return ` AND ${row}.key NOT IN (${profileKeys})`
  if (table === 'sync_state') return ` AND ${row}.key <> 'applying'`
  return ''
}

function triggersFor(table: string, key: string): string[] {
  const events: Array<['ai' | 'au' | 'ad', string, 'NEW' | 'OLD']> = [
    ['ai', 'INSERT', 'NEW'],
    ['au', 'UPDATE', 'NEW'],
    ['ad', 'DELETE', 'OLD']
  ]
  return events.map(
    ([suffix, event, row]) =>
      `CREATE TRIGGER device_${table}_${suffix} AFTER ${event} ON ${table}
       WHEN ${NOT_APPLYING}${onlyDeviceRows(table, row)}
       BEGIN INSERT INTO device_outbox (tbl, row_key) VALUES ('${table}', ${row}.${key}); END`
  )
}

export const migration0020DeviceStore: Migration = {
  version: 20,
  description: 'Option A: device rows noted for the encrypted device store; files stay in memory',
  statements: [
    `CREATE TABLE device_outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      tbl TEXT NOT NULL,
      row_key TEXT NOT NULL
    )`,
    ...Object.entries(DEVICE_TABLES).flatMap(([table, key]) => triggersFor(table, key))
  ]
}
