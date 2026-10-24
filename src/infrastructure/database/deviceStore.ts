import type { DB } from '@op-engineering/op-sqlite'
import { DEVICE_TABLES } from './migrations/0020_device_store'
import { SYNCED_ID_TABLES, SYNCED_PAIR_TABLES, SYNCED_SETTING_KEYS } from './migrations/0019_server_sync'
import { PHOTO_TABLES } from './migrations/0021_photos'

/**
 * Amin #5040: the profile name and agency stay on the phone (encrypted, for the signed-in account), so they show
 * offline too. The photo is not kept.
 */
export const KEPT_PROFILE_KEYS = ['display_name', 'agency_name'] as const
const PROFILE_META = 'profile'

/** A file row as it is now, or null when it was deleted. */
export type QueuedChange = { t: string; k: string; row: Record<string, unknown> | null }

/** Parents first, so a written row always finds the row it points at. */
export const FILE_TABLE_ORDER: string[] = [
  ...SYNCED_ID_TABLES.slice(0, 7),
  'owner_file_amenities',
  ...SYNCED_ID_TABLES.slice(7, 10),
  'requirement_criterion_suppressions',
  ...SYNCED_ID_TABLES.slice(10),
  ...PHOTO_TABLES,
  'application_settings'
]

/**
 * Amin #4826 (option A): «پایه برنامه آنلاین، فقط وقتی آفلاینه موقت روی گوشی، وقتی آنلاین شد خودکار میره روی سرور و
 * از گوشی پاک میشه».
 *
 * The working database (every file the screens read) lives in memory only and is filled from the server. This
 * encrypted store (SQLCipher, key in the platform keychain) is the only thing written to the phone's disk:
 * - `device_rows`: what the phone itself must remember — who is signed in, its own settings, the sync state;
 * - `queue`: file changes that have not reached the server yet (made offline, or in the seconds before a push).
 *   A change leaves the phone the moment the server has it.
 * Every write to the working database is followed by `persistFrom`, so a change is on disk (encrypted) before the
 * screen that made it goes on.
 */
export class DeviceStore {
  private columns = new Map<string, Set<string>>()
  private chain: Promise<unknown> = Promise.resolve()

  constructor(private readonly store: DB) {}

  /** Creates the store's tables; true when the store did not exist before (a fresh install). */
  async init(): Promise<boolean> {
    await this.store.execute(
      'CREATE TABLE IF NOT EXISTS device_rows (tbl TEXT NOT NULL, row_key TEXT NOT NULL, row_json TEXT NOT NULL, PRIMARY KEY (tbl, row_key))'
    )
    await this.store.execute(
      `CREATE TABLE IF NOT EXISTS queue (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        tbl TEXT NOT NULL,
        row_key TEXT NOT NULL,
        row_json TEXT,
        at TEXT NOT NULL
      )`
    )
    await this.store.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT)')
    const created = await this.getMeta('created')
    if (created) return false
    await this.setMeta('created', new Date().toISOString())
    return true
  }

  async getMeta(key: string): Promise<string | null> {
    const result = await this.store.execute('SELECT value FROM meta WHERE key = ?', [key])
    return (result.rows[0]?.value as string | null | undefined) ?? null
  }

  async setMeta(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await this.store.execute('DELETE FROM meta WHERE key = ?', [key])
      return
    }
    await this.store.execute(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    )
  }

  close(): void {
    this.store.close()
  }

  /** The account whose files this phone shows (changes made without one are claimed by the next account set). */
  owner(): Promise<string | null> {
    return this.getMeta('owner')
  }

  async setOwner(userId: string | null): Promise<void> {
    await this.setMeta('owner', userId)
    if (userId) await this.store.execute("UPDATE queue SET owner = ? WHERE owner = ''", [userId])
  }

  /** Moves what the working database noted since the last call to the encrypted store. One run at a time. */
  persistFrom(db: DB): Promise<void> {
    // the store's own writes must not wait for the store (connection.ts wraps the working database)
    const raw = unwrap(db)
    const run = this.chain.then(() => this.persistNow(raw))
    this.chain = run.catch(() => undefined)
    return run
  }

  /** Writes the remembered device rows and this account's unsent changes into a fresh working database. */
  async loadInto(working: DB): Promise<void> {
    const db = unwrap(working)
    const owner = await this.owner()
    await applying(db, async () => {
      for (const table of Object.keys(DEVICE_TABLES)) {
        const result = await this.store.execute('SELECT row_json FROM device_rows WHERE tbl = ?', [table])
        for (const r of result.rows) await this.writeRow(db, table, JSON.parse(String(r.row_json)))
      }
      if (owner) await this.writeProfile(db, owner)
      if (owner) await this.writeQueued(db, owner)
    })
  }

  /** Keeps the account's name and agency as they are now in the working database (after a restore, an edit). */
  async rememberProfile(working: DB): Promise<void> {
    const db = unwrap(working)
    const owner = await this.owner()
    if (!owner) return
    const profile: Record<string, string> = {}
    for (const key of KEPT_PROFILE_KEYS) {
      const result = await db.execute('SELECT value FROM application_settings WHERE key = ?', [key])
      const value = result.rows[0]?.value
      if (typeof value === 'string' && value) profile[key] = value
    }
    await this.setMeta(PROFILE_META, JSON.stringify({ owner, profile }))
  }

  /** Shows the account's kept name and agency again (when this phone opens for the account). */
  async profileInto(working: DB, owner: string): Promise<void> {
    const db = unwrap(working)
    await applying(db, () => this.writeProfile(db, owner))
  }

  /** Sign-out: the name leaves the phone with the files. */
  async forgetProfile(): Promise<void> {
    await this.setMeta(PROFILE_META, null)
  }

  /** Puts this account's unsent changes on top of the files in the working database. */
  async replayInto(working: DB, owner: string): Promise<void> {
    const db = unwrap(working)
    await applying(db, () => this.writeQueued(db, owner))
  }

  /** This account's unsent changes, one per row (its latest state), oldest first; and the last queue number read. */
  async pending(owner: string): Promise<{ changes: QueuedChange[]; upTo: number }> {
    const max = await this.store.execute('SELECT MAX(seq) AS m FROM queue WHERE owner = ?', [owner])
    const upTo = Number(max.rows[0]?.m ?? 0)
    if (!upTo) return { changes: [], upTo: 0 }
    const result = await this.store.execute(
      `SELECT q.tbl, q.row_key, q.row_json FROM queue q
       WHERE q.owner = ? AND q.seq <= ? AND q.seq = (
         SELECT MAX(seq) FROM queue WHERE owner = q.owner AND tbl = q.tbl AND row_key = q.row_key AND seq <= ?)
       ORDER BY q.seq`,
      [owner, upTo, upTo]
    )
    return {
      changes: result.rows.map((r) => ({
        t: String(r.tbl),
        k: String(r.row_key),
        row: r.row_json === null || r.row_json === undefined ? null : JSON.parse(String(r.row_json))
      })),
      upTo
    }
  }

  /** The server has these: they leave the phone. */
  async dropSent(owner: string, upTo: number): Promise<void> {
    await this.store.execute('DELETE FROM queue WHERE owner = ? AND seq <= ?', [owner, upTo])
  }

  /** How many rows still wait for the server. */
  async count(owner: string): Promise<number> {
    const result = await this.store.execute(
      'SELECT COUNT(*) AS n FROM (SELECT DISTINCT tbl, row_key FROM queue WHERE owner = ?)',
      [owner]
    )
    return Number(result.rows[0]?.n ?? 0)
  }

  /** Sign-out: nothing of the account's files stays on the phone. */
  async clearQueue(): Promise<void> {
    await this.store.execute('DELETE FROM queue')
  }

  /**
   * The database earlier versions kept on disk: everything in it becomes a queued change (so it reaches the
   * server with the next push and then leaves the phone), its device rows are remembered, and the caller deletes it.
   * Files a previous version already sent and confirmed are not sent again.
   */
  async takeOver(legacy: DB, owner: string | null): Promise<void> {
    const state = async (key: string): Promise<string | null> => {
      const r = await legacy.execute('SELECT value FROM sync_state WHERE key = ?', [key]).catch(() => null)
      return (r?.rows[0]?.value as string | null | undefined) ?? null
    }
    const outbox = await legacy.execute('SELECT COUNT(*) AS n FROM sync_outbox').catch(() => null)
    const allSent = (await state('initial_upload')) === 'done' && Number(outbox?.rows[0]?.n ?? 0) === 0
    const legacyOwner = (await state('owner')) ?? owner ?? ''
    const at = new Date().toISOString()

    for (const [table, key] of Object.entries(DEVICE_TABLES)) {
      if (table === 'sync_state') continue // the old sync bookkeeping does not apply any more
      const result = await legacy.execute(`SELECT * FROM ${table}`)
      for (const row of result.rows) {
        if (table === 'application_settings' && (SYNCED_SETTING_KEYS as readonly string[]).includes(String(row.key))) continue
        await this.store.execute('INSERT OR REPLACE INTO device_rows (tbl, row_key, row_json) VALUES (?, ?, ?)', [
          table,
          String(row[key]),
          JSON.stringify({ ...row })
        ])
      }
    }
    if (legacyOwner) await this.setMeta('owner', legacyOwner)
    if (allSent) return
    for (const table of FILE_TABLE_ORDER) {
      const result =
        table === 'application_settings'
          ? await legacy.execute(
              `SELECT * FROM application_settings WHERE key IN (${SYNCED_SETTING_KEYS.map(() => '?').join(', ')})`,
              [...SYNCED_SETTING_KEYS]
            )
          : await legacy.execute(`SELECT * FROM ${table}`)
      for (const row of result.rows) {
        await this.store.execute('INSERT INTO queue (owner, tbl, row_key, row_json, at) VALUES (?, ?, ?, ?, ?)', [
          legacyOwner,
          table,
          rowKey(table, row),
          JSON.stringify({ ...row }),
          at
        ])
      }
    }
  }

  // ------------------------------------------------------------------ internals

  private async persistNow(db: DB): Promise<void> {
    const device = await db.execute('SELECT MAX(seq) AS m FROM device_outbox')
    const deviceUpTo = Number(device.rows[0]?.m ?? 0)
    if (deviceUpTo) {
      const keys = await db.execute('SELECT DISTINCT tbl, row_key FROM device_outbox WHERE seq <= ?', [deviceUpTo])
      for (const k of keys.rows) {
        const table = String(k.tbl)
        const key = String(k.row_key)
        const row = await readRow(db, table, key, DEVICE_TABLES[table as keyof typeof DEVICE_TABLES])
        if (row) {
          await this.store.execute('INSERT OR REPLACE INTO device_rows (tbl, row_key, row_json) VALUES (?, ?, ?)', [
            table,
            key,
            JSON.stringify(row)
          ])
        } else {
          await this.store.execute('DELETE FROM device_rows WHERE tbl = ? AND row_key = ?', [table, key])
        }
      }
      await db.execute('DELETE FROM device_outbox WHERE seq <= ?', [deviceUpTo])
    }

    const files = await db.execute('SELECT MAX(seq) AS m FROM sync_outbox')
    const filesUpTo = Number(files.rows[0]?.m ?? 0)
    if (filesUpTo) {
      const owner = (await this.owner()) ?? ''
      const keys = await db.execute(
        'SELECT tbl, row_key FROM sync_outbox WHERE seq <= ? GROUP BY tbl, row_key ORDER BY MIN(seq)',
        [filesUpTo]
      )
      const at = new Date().toISOString()
      let profileChanged = false
      for (const k of keys.rows) {
        const table = String(k.tbl)
        const key = String(k.row_key)
        if (table === 'application_settings' && (KEPT_PROFILE_KEYS as readonly string[]).includes(key)) {
          profileChanged = true
        }
        const row = await readFileRow(db, table, key)
        await this.store.execute('INSERT INTO queue (owner, tbl, row_key, row_json, at) VALUES (?, ?, ?, ?, ?)', [
          owner,
          table,
          key,
          row ? JSON.stringify(row) : null,
          at
        ])
      }
      await db.execute('DELETE FROM sync_outbox WHERE seq <= ?', [filesUpTo])
      if (profileChanged) await this.rememberProfile(db)
    }
  }

  private async writeProfile(db: DB, owner: string): Promise<void> {
    const saved = await this.getMeta(PROFILE_META)
    if (!saved) return
    const { owner: of, profile } = JSON.parse(saved) as { owner: string; profile: Record<string, string> }
    if (of !== owner) return // another account's name never shows
    for (const [key, value] of Object.entries(profile)) {
      await db.execute('INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?, ?, ?)', [
        key,
        value,
        new Date().toISOString()
      ])
    }
  }

  private async writeQueued(db: DB, owner: string): Promise<void> {
    const { changes } = await this.pending(owner)
    const byTable = new Map<string, QueuedChange[]>()
    for (const change of changes) byTable.set(change.t, [...(byTable.get(change.t) ?? []), change])
    for (const table of FILE_TABLE_ORDER) {
      for (const change of byTable.get(table) ?? []) {
        if (change.row) await this.writeRow(db, table, change.row)
        else await deleteFileRow(db, table, change.k)
      }
    }
  }

  private async writeRow(db: DB, table: string, row: Record<string, unknown>): Promise<void> {
    const cols = await this.columnsOf(db, table)
    const names = Object.keys(row).filter((c) => cols.has(c))
    if (names.length === 0) return
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
      names.map((n) => row[n] as never)
    )
  }

  private async columnsOf(db: DB, table: string): Promise<Set<string>> {
    const known = this.columns.get(table)
    if (known) return known
    const result = await db.execute('SELECT name FROM pragma_table_info(?)', [table])
    const cols = new Set(result.rows.map((r) => String(r.name)))
    this.columns.set(table, cols)
    return cols
  }
}

/** connection.ts marks its wrapped working database with this; the store works on the connection under it */
export const RAW_DB = Symbol('raw working database')

function unwrap(db: DB): DB {
  return ((db as unknown as Record<symbol, DB | undefined>)[RAW_DB]) ?? db
}

/** Writes with the change triggers off (rows that come from the server or the store are not new changes). */
export async function applying(db: DB, work: () => Promise<void>): Promise<void> {
  await db.execute("INSERT OR REPLACE INTO sync_state (key, value) VALUES ('applying', '1')")
  try {
    await db.execute('PRAGMA foreign_keys = OFF')
    await work()
  } finally {
    await db.execute('PRAGMA foreign_keys = ON')
    await db.execute("DELETE FROM sync_state WHERE key = 'applying'")
  }
}

function rowKey(table: string, row: Record<string, unknown>): string {
  if (table === 'application_settings') return String(row.key)
  if (table in SYNCED_PAIR_TABLES) {
    const [a, b] = SYNCED_PAIR_TABLES[table as keyof typeof SYNCED_PAIR_TABLES]
    return `${String(row[a])}|${String(row[b])}`
  }
  return String(row.id)
}

async function readRow(db: DB, table: string, key: string, column: string): Promise<Record<string, unknown> | null> {
  const result = await db.execute(`SELECT * FROM ${table} WHERE ${column} = ?`, [key])
  const row = result.rows[0]
  return row ? { ...row } : null
}

export async function readFileRow(db: DB, table: string, key: string): Promise<Record<string, unknown> | null> {
  if (table === 'application_settings') return readRow(db, table, key, 'key')
  if (table in SYNCED_PAIR_TABLES) {
    const [a, b] = SYNCED_PAIR_TABLES[table as keyof typeof SYNCED_PAIR_TABLES]
    const [va, vb] = key.split('|')
    const result = await db.execute(`SELECT * FROM ${table} WHERE ${a} = ? AND ${b} = ?`, [va ?? '', vb ?? ''])
    const row = result.rows[0]
    return row ? { ...row } : null
  }
  return readRow(db, table, key, 'id')
}

async function deleteFileRow(db: DB, table: string, key: string): Promise<void> {
  if (table === 'application_settings') {
    await db.execute('DELETE FROM application_settings WHERE key = ?', [key])
  } else if (table in SYNCED_PAIR_TABLES) {
    const [a, b] = SYNCED_PAIR_TABLES[table as keyof typeof SYNCED_PAIR_TABLES]
    const [va, vb] = key.split('|')
    await db.execute(`DELETE FROM ${table} WHERE ${a} = ? AND ${b} = ?`, [va ?? '', vb ?? ''])
  } else {
    await db.execute(`DELETE FROM ${table} WHERE id = ?`, [key])
  }
}
