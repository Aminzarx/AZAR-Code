import type { DB } from '@op-engineering/op-sqlite'
import { SYNCED_SETTING_KEYS } from '../database/migrations/0019_server_sync'
import { applying, FILE_TABLE_ORDER, type DeviceStore, type QueuedChange } from '../database/deviceStore'
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

/**
 * AZAR-SYNC-001 with option A (Amin #4826): the account's files live on the KSS server and the phone only shows
 * them. The working database is in memory (connection.ts); the encrypted device store keeps nothing of the files
 * but the changes not on the server yet.
 * - restore: fills the working database from the server (sign-in, every launch, coming back online), with the
 *   unsent changes on top;
 * - push: sends the unsent changes; what the server has leaves the phone;
 * - wipe: on sign-out, nothing of the account's files stays.
 * `loaded` says whether the server's files are in the working database this run; until then the phone shows only
 * what was made on it offline.
 */
export class SyncService {
  private isLoaded = false
  private columns = new Map<string, Set<string>>()

  constructor(
    private readonly db: DB,
    private readonly store: DeviceStore,
    private readonly api: SyncApiClient,
    private readonly files: SyncFiles
  ) {}

  /** whether the account's files came from the server in this run */
  get loaded(): boolean {
    return this.isLoaded
  }

  async getState(key: string): Promise<string | null> {
    const result = await this.db.execute('SELECT value FROM sync_state WHERE key = ?', [key])
    return (result.rows[0]?.value as string | null | undefined) ?? null
  }

  async setState(key: string, value: string | null): Promise<void> {
    await this.db.execute(
      'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    )
    await this.store.persistFrom(this.db)
  }

  /** Changes still waiting to reach the server (one per row, however often it was edited). */
  async pendingCount(): Promise<number> {
    await this.store.persistFrom(this.db)
    return this.store.count((await this.store.owner()) ?? '')
  }

  /** The last storage use the server reported, if any. */
  async lastUsage(): Promise<SyncUsage | null> {
    const raw = await this.getState('usage')
    return raw ? (JSON.parse(raw) as SyncUsage) : null
  }

  /** The account this phone's files belong to. */
  owner(): Promise<string | null> {
    return this.store.owner()
  }

  /**
   * Before the app opens for a number: another account's files leave the working database (that account's
   * unsent changes stay queued for it, encrypted), and this account's unsent changes show at once, even offline.
   */
  async claim(userId: string): Promise<void> {
    if ((await this.store.owner()) === userId) return
    await this.clearFiles()
    this.isLoaded = false
    await this.store.setOwner(userId)
    await this.store.profileInto(this.db, userId)
    await this.store.replayInto(this.db, userId)
  }

  /**
   * Sends everything waiting; what the server has leaves the phone. Throws SessionRevokedError /
   * StorageFullError / NetworkFailureError; what was not sent stays queued for the next try.
   */
  async push(sessionToken: string, userId: string): Promise<void> {
    await this.store.persistFrom(this.db)
    if (!(await this.store.owner())) await this.store.setOwner(userId)
    const { changes, upTo } = await this.store.pending(userId)
    if (!upTo) return
    await this.uploadPhoto(sessionToken, changes)
    let usage: SyncUsage | null = null
    for (let i = 0; i < changes.length; i += BATCH) {
      usage = (await this.api.push(sessionToken, changes.slice(i, i + BATCH))).usage
    }
    await this.store.dropSent(userId, upTo)
    if (usage) await this.setState('usage', JSON.stringify(usage))
  }

  /** Asks the server how much space the account uses (for the tokens card). */
  async refreshUsage(sessionToken: string): Promise<SyncUsage> {
    const { usage } = await this.api.usage(sessionToken)
    await this.setState('usage', JSON.stringify(usage))
    return usage
  }

  /** Fills the working database with the account's files from the server, the unsent changes on top. */
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

    await this.store.persistFrom(this.db)
    await applying(this.db, () =>
      this.db.transaction(async (tx) => {
        for (const table of FILE_TABLE_ORDER) {
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
    )
    // anything made on this phone and not on the server yet stays on top
    await this.store.setOwner(userId)
    await this.store.replayInto(this.db, userId)
    await this.store.rememberProfile(this.db)
    await this.setState('usage', JSON.stringify(pulled.usage))
    this.isLoaded = true
    return pulled.rows.length
  }

  /** Signing out: nothing of the account's files stays on this phone (they are on the server). */
  async wipe(): Promise<void> {
    await this.clearFiles()
    await this.store.clearQueue()
    await this.store.forgetProfile()
    await this.store.setOwner(null)
    await this.setState('usage', null)
    await this.setState('photo_hash', null)
    this.isLoaded = false
  }

  /**
   * Another phone took the number: the files leave the working database; changes that never reached the server
   * stay queued (encrypted) until the same number signs in again.
   */
  async forget(): Promise<void> {
    await this.clearFiles()
    this.isLoaded = false
  }

  // ------------------------------------------------------------------ internals

  private async clearFiles(): Promise<void> {
    await this.store.persistFrom(this.db)
    const photoPath = await this.settingValue(PHOTO_KEY)
    await applying(this.db, () =>
      this.db.transaction(async (tx) => {
        for (const table of [...FILE_TABLE_ORDER].reverse()) {
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
        // computed from the files above
        await tx.execute('DELETE FROM match_explanations')
        await tx.execute('DELETE FROM matches')
        await tx.execute('DELETE FROM sync_outbox')
      })
    )
    if (photoPath && !photoPath.startsWith(BLOB_PREFIX)) await this.files.remove(photoPath).catch(() => undefined)
  }

  private async settingValue(key: string): Promise<string | null> {
    const result = await this.db.execute('SELECT value FROM application_settings WHERE key = ?', [key])
    return (result.rows[0]?.value as string | null | undefined) ?? null
  }

  /** The profile photo travels as a photo of its own; the setting row carries its hash instead of the phone's path. */
  private async uploadPhoto(sessionToken: string, changes: QueuedChange[]): Promise<void> {
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
