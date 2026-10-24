import type { Migration } from '../types'

/**
 * AZAR-SYNC-001 (Amin #4142/#4147/#4192, GO #4797): files live on the number's
 * account on the KSS server. Every insert, update or delete of a file table is
 * written to `sync_outbox` by a trigger, so no repository has to remember to
 * sync; the sync service sends the outbox as soon as the phone is online and
 * clears it. While the service writes rows pulled from the server it sets
 * `sync_state.applying = '1'`, which the triggers skip.
 *
 * `initial_upload = 'pending'` makes the first launch of this version send the
 * whole database once (existing users: their files move to the server).
 */
export const SYNCED_ID_TABLES = [
  'lost_reasons',
  'reminder_schedules',
  'contacts',
  'contact_roles',
  'properties',
  'owner_files',
  'listings',
  'applicants',
  'applicant_files',
  'requirement_criteria',
  'restrictions',
  'deals',
  'deal_stage_history',
  'contracts',
  'reminders',
  'notes',
  'activities'
] as const

/** Tables keyed by two columns: the key sent to the server is `a|b`. */
export const SYNCED_PAIR_TABLES = {
  owner_file_amenities: ['owner_file_id', 'amenity_id'],
  requirement_criterion_suppressions: ['criterion_id', 'suppressed_criterion_id']
} as const

/** Only the profile keys of application_settings belong to the account; the rest are this phone's own settings. */
export const SYNCED_SETTING_KEYS = ['display_name', 'agency_name', 'profile_photo'] as const

const NOT_APPLYING = `(SELECT value FROM sync_state WHERE key = 'applying') IS NOT '1'`

function triggersFor(table: string, key: (row: 'NEW' | 'OLD') => string, extraWhen = (_row: 'NEW' | 'OLD') => ''): string[] {
  const events: Array<['ai' | 'au' | 'ad', string, 'NEW' | 'OLD']> = [
    ['ai', 'INSERT', 'NEW'],
    ['au', 'UPDATE', 'NEW'],
    ['ad', 'DELETE', 'OLD']
  ]
  return events.map(
    ([suffix, event, row]) =>
      `CREATE TRIGGER sync_${table}_${suffix} AFTER ${event} ON ${table}
       WHEN ${NOT_APPLYING}${extraWhen(row)}
       BEGIN INSERT INTO sync_outbox (tbl, row_key, at) VALUES ('${table}', ${key(row)}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')); END`
  )
}

const settingKeys = SYNCED_SETTING_KEYS.map((k) => `'${k}'`).join(', ')

export const migration0019ServerSync: Migration = {
  version: 19,
  description: 'Server sync: outbox, sync state and change triggers on every file table',
  statements: [
    `CREATE TABLE sync_outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      tbl TEXT NOT NULL,
      row_key TEXT NOT NULL,
      at TEXT NOT NULL
    )`,
    `CREATE TABLE sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    )`,
    `INSERT INTO sync_state (key, value) VALUES ('initial_upload', 'pending')`,
    ...SYNCED_ID_TABLES.flatMap((t) => triggersFor(t, (r) => `${r}.id`)),
    ...Object.entries(SYNCED_PAIR_TABLES).flatMap(([t, [a, b]]) => triggersFor(t, (r) => `${r}.${a} || '|' || ${r}.${b}`)),
    ...triggersFor('application_settings', (r) => `${r}.key`, (r) => ` AND ${r}.key IN (${settingKeys})`)
  ]
}
