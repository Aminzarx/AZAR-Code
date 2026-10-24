import type { DB } from '@op-engineering/op-sqlite'
import {
  SYNCED_ID_TABLES,
  SYNCED_PAIR_TABLES,
  SYNCED_SETTING_KEYS
} from '../database/migrations/0019_server_sync'
import { type SyncApiClient, type SyncChange, type SyncUsage } from './syncApiClient'

/** Where the profile photo is read from and written to (react-native-fs in the app, a fake in tests). */
export type SyncFiles = {
  dir: string
  readBase64(path: string): Promise<string>
  writeBase64(path: string, base64: string): Promise<void>
  remove(path: string): Promise<void>
}

const PHOTO_KEY = 'profile_photo'
const BLOB_PREFIX = 'blob:'
const BATCH = 200

/** Parents first, so a restored row always finds the row it points at. */
const RESTORE_ORDER: string[] = [
  ...SYNCED_ID_TABLES.slice(0, 7),
  'owner_file_amenities',
  ...SYNCED_ID_TABLES.slice(7, 10),
  'requirement_criterion_suppressions',
  ...SYNCED_ID_TABLES.slice(10),
  'application_settings'
]

/** Tables whose rows count as «the user has files on this phone». */
const FILE_TABLES = ['properties', 'applicants', 'contacts', 'deals', 'contracts', 'reminders', 'owner_files', 'applicant_files']

/**
 * AZAR-SYNC-001 (Amin #4142/#4147/#4192, GO #4797): the phone keeps an
 * encrypted working copy (SQLCipher) and the account's files live on the KSS
 * server.
 * - push: sends every change the triggers wrote to `sync_outbox` (the row as it
 *   is now, or null when deleted), then clears what was sent;
 * - restore: on sign-in on a phone with no files, brings everything back;
 * - wipe: on sign-out or when another phone takes the number, removes every
 *   file and the profile photo from this phone.
 * The first launch of this version sends the whole database once
 * (`initial_upload`), which moves existing users' files to the server.
 */
export class SyncService {
  private columns = new Map<string, Set<string>>()

  constructor(
    private readonly db: DB,
    private readonly api: SyncApiClient,
    private readonly files: SyncFiles
  ) {}

  async getState(key: string): Promise<string | null> {
    const result = await this.db.execute('SELECT value FROM sync_state WHERE key = ?', [key])
    return (result.rows[0]?.value as string | null | undefined) ?? null
  }

  async setState(key: string, value: string | null): Promise<void> {
    await this.db.execute(
      'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    )
  }

  /** Changes still waiting to reach the server (one per row, however often it was edited). */
  async pendingCount(): Promise<number> {
    const result = await this.db.execute('SELECT COUNT(*) AS n FROM (SELECT DISTINCT tbl, row_key FROM sync_outbox)')
    const queued = Number(result.rows[0]?.n ?? 0)
    if (queued > 0) return queued
    return (await this.getState('initial_upload')) === 'pending' && (await this.hasLocalFiles()) ? 1 : 0
  }

  async hasLocalFiles(): Promise<boolean> {
    for (const table of FILE_TABLES) {
      const result = await this.db.execute(`SELECT 1 AS x FROM ${table} LIMIT 1`)
      if (result.rows.length > 0) return true
    }
    return false
  }

  /** The last storage use the server reported, if any. */
  async lastUsage(): Promise<SyncUsage | null> {
    const raw = await this.getState('usage')
    return raw ? (JSON.parse(raw) as SyncUsage) : null
  }

  /** The account this phone's files belong to (set at the first sync). */
  owner(): Promise<string | null> {
    return this.getState('owner')
  }

  /**
   * Sends everything waiting. Throws SessionRevokedError / StorageFullError /
   * NetworkFailureError; what was not sent stays queued for the next try.
   */
  async push(sessionToken: string, userId: string): Promise<void> {
    if ((await this.getState('initial_upload')) === 'pending') {
      await this.enqueueAll()
      await this.setState('initial_upload', 'done')
    }
    if (!(await this.owner())) await this.setState('owner', userId)

    const max = await this.db.execute('SELECT MAX(seq) AS m FROM sync_outbox')
    const maxSeq = Number(max.rows[0]?.m ?? 0)
    if (!maxSeq) return
    const keys = await this.db.execute(
      'SELECT tbl, row_key FROM sync_outbox WHERE seq <= ? GROUP BY tbl, row_key ORDER BY MIN(seq)',
      [maxSeq]
    )
    const changes: SyncChange[] = []
    for (const k of keys.rows) {
      changes.push({ t: String(k.tbl), k: String(k.row_key), row: await this.readRow(String(k.tbl), String(k.row_key)) })
    }
    await this.uploadPhoto(sessionToken, changes)
    let usage: SyncUsage | null = null
    for (let i = 0; i < changes.length; i += BATCH) {
      usage = (await this.api.push(sessionToken, changes.slice(i, i + BATCH))).usage
    }
    await this.db.execute('DELETE FROM sync_outbox WHERE seq <= ?', [maxSeq])
    if (usage) await this.setState('usage', JSON.stringify(usage))
  }

  /** Asks the server how much space the account uses (for the tokens card). */
  async refreshUsage(sessionToken: string): Promise<SyncUsage> {
    const { usage } = await this.api.usage(sessionToken)
    await this.setState('usage', JSON.stringify(usage))
    return usage
  }

  /** Brings the account's files to this phone (sign-in on a phone without files). */
  async restore(sessionToken: string, userId: string): Promise<number> {
    const pulled = await this.api.pull(sessionToken)
    const byTable = new Map<string, SyncChange[]>()
    for (const change of pulled.rows) {
      if (!change.row) continue
      const list = byTable.get(change.t) ?? []
      list.push(change)
      byTable.set(change.t, list)
    }
    const photo = byTable.get('application_settings')?.find((c) => c.k === PHOTO_KEY)
    if (photo?.row) await this.downloadPhoto(sessionToken, photo.row)

    await this.setState('applying', '1')
    try {
      await this.db.execute('PRAGMA foreign_keys = OFF')
      await this.db.transaction(async (tx) => {
        for (const table of RESTORE_ORDER) {
          const cols = await this.columnsOf(table)
          for (const { row } of byTable.get(table) ?? []) {
            if (!row) continue
            const names = Object.keys(row).filter((c) => cols.has(c))
            if (names.length === 0) continue
            await tx.execute(
              `INSERT OR REPLACE INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
              names.map((n) => row[n] as never)
            )
          }
        }
      })
    } finally {
      await this.db.execute('PRAGMA foreign_keys = ON')
      await this.setState('applying', null)
    }
    // rows written here skipped the outbox; anything the user made meanwhile stays queued
    await this.setState('initial_upload', 'done')
    await this.setState('owner', userId)
    await this.setState('usage', JSON.stringify(pulled.usage))
    return pulled.rows.length
  }

  /** Removes every file of the account from this phone (they stay on the server). */
  async wipe(): Promise<void> {
    const photoPath = await this.settingValue(PHOTO_KEY)
    await this.setState('applying', '1')
    try {
      await this.db.execute('PRAGMA foreign_keys = OFF')
      await this.db.transaction(async (tx) => {
        for (const table of [...RESTORE_ORDER].reverse()) {
          if (table === 'application_settings') {
            await tx.execute(
              `DELETE FROM application_settings WHERE key IN (${SYNCED_SETTING_KEYS.map(() => '?').join(', ')})`,
              [...SYNCED_SETTING_KEYS]
            )
          } else if (table === 'lost_reasons') {
            // the built-in reasons come with the app, not with the account
            await tx.execute('DELETE FROM lost_reasons WHERE is_system_default = 0')
          } else {
            await tx.execute(`DELETE FROM ${table}`)
          }
        }
        // computed from the files above; rebuilt from the restored files on the next phone
        await tx.execute('DELETE FROM match_explanations')
        await tx.execute('DELETE FROM matches')
        await tx.execute('DELETE FROM sync_outbox')
      })
    } finally {
      await this.db.execute('PRAGMA foreign_keys = ON')
      await this.setState('applying', null)
    }
    if (photoPath && !photoPath.startsWith(BLOB_PREFIX)) await this.files.remove(photoPath).catch(() => undefined)
    await this.setState('initial_upload', 'done')
    await this.setState('owner', null)
    await this.setState('usage', null)
    await this.setState('photo_hash', null)
  }

  // ------------------------------------------------------------------ internals

  private async enqueueAll(): Promise<void> {
    const at = new Date().toISOString()
    for (const table of SYNCED_ID_TABLES) {
      await this.db.execute(`INSERT INTO sync_outbox (tbl, row_key, at) SELECT ?, id, ? FROM ${table}`, [table, at])
    }
    for (const [table, [a, b]] of Object.entries(SYNCED_PAIR_TABLES)) {
      await this.db.execute(`INSERT INTO sync_outbox (tbl, row_key, at) SELECT ?, ${a} || '|' || ${b}, ? FROM ${table}`, [table, at])
    }
    await this.db.execute(
      `INSERT INTO sync_outbox (tbl, row_key, at) SELECT 'application_settings', key, ? FROM application_settings WHERE key IN (${SYNCED_SETTING_KEYS.map(() => '?').join(', ')})`,
      [at, ...SYNCED_SETTING_KEYS]
    )
  }

  private async readRow(table: string, key: string): Promise<Record<string, unknown> | null> {
    let result
    if (table === 'application_settings') {
      result = await this.db.execute('SELECT * FROM application_settings WHERE key = ?', [key])
    } else if (table in SYNCED_PAIR_TABLES) {
      const [a, b] = SYNCED_PAIR_TABLES[table as keyof typeof SYNCED_PAIR_TABLES]
      const [va, vb] = key.split('|')
      result = await this.db.execute(`SELECT * FROM ${table} WHERE ${a} = ? AND ${b} = ?`, [va ?? '', vb ?? ''])
    } else {
      result = await this.db.execute(`SELECT * FROM ${table} WHERE id = ?`, [key])
    }
    const row = result.rows[0]
    return row ? { ...row } : null
  }

  private async settingValue(key: string): Promise<string | null> {
    const result = await this.db.execute('SELECT value FROM application_settings WHERE key = ?', [key])
    return (result.rows[0]?.value as string | null | undefined) ?? null
  }

  /** The profile photo travels as a photo of its own; the setting row carries its hash instead of the phone's path. */
  private async uploadPhoto(sessionToken: string, changes: SyncChange[]): Promise<void> {
    const change = changes.find((c) => c.t === 'application_settings' && c.k === PHOTO_KEY)
    if (!change) return
    const previous = await this.getState('photo_hash')
    const path = change.row?.value as string | null | undefined
    let hash: string | null = null
    if (path && !path.startsWith(BLOB_PREFIX)) {
      const data = await this.files.readBase64(path)
      hash = (await this.api.putBlob(sessionToken, data)).hash
      change.row = { ...change.row, value: BLOB_PREFIX + hash }
    } else if (path) {
      hash = path.slice(BLOB_PREFIX.length)
    }
    if (previous && previous !== hash) await this.api.deleteBlob(sessionToken, previous).catch(() => undefined)
    await this.setState('photo_hash', hash)
  }

  private async downloadPhoto(sessionToken: string, row: Record<string, unknown>): Promise<void> {
    const value = row.value as string | null | undefined
    if (!value || !value.startsWith(BLOB_PREFIX)) {
      row.value = null
      return
    }
    const hash = value.slice(BLOB_PREFIX.length)
    const { data } = await this.api.getBlob(sessionToken, hash)
    const path = `${this.files.dir}/profile/photo-${hash.slice(0, 12)}.webp`
    await this.files.writeBase64(path, data)
    row.value = path
    await this.setState('photo_hash', hash)
  }

  private async columnsOf(table: string): Promise<Set<string>> {
    const known = this.columns.get(table)
    if (known) return known
    const result = await this.db.execute('SELECT name FROM pragma_table_info(?)', [table])
    const cols = new Set(result.rows.map((r) => String(r.name)))
    this.columns.set(table, cols)
    return cols
  }
}
