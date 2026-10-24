import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { SyncService, type SyncFiles } from '../SyncService'
import {
  SessionRevokedError,
  type PullResult,
  type SyncApiClient,
  type SyncChange,
  type SyncUsage
} from '../syncApiClient'

const USER = 'user-1'
const TOKEN = 'tok'

/** The server side of AZAR-SYNC-001, kept in memory. */
class FakeServer {
  rows = new Map<string, SyncChange>()
  blobs = new Map<string, string>()
  revoked = false
  pushes = 0

  private usage(): SyncUsage {
    return { bytes: this.rows.size, quotaBytes: 50_000_000, tokens: 0 }
  }

  private check(): void {
    if (this.revoked) throw new SessionRevokedError()
  }

  api(): SyncApiClient {
    return {
      push: async (_t: string, changes: SyncChange[]) => {
        this.check()
        this.pushes++
        for (const c of changes) {
          const id = `${c.t}/${c.k}`
          if (c.row === null) this.rows.delete(id)
          else this.rows.set(id, JSON.parse(JSON.stringify(c)) as SyncChange)
        }
        return { usage: this.usage() }
      },
      pull: async (): Promise<PullResult> => {
        this.check()
        return { rows: [...this.rows.values()].map((c) => JSON.parse(JSON.stringify(c)) as SyncChange), blobs: [...this.blobs.keys()], usage: this.usage() }
      },
      usage: async () => ({ usage: this.usage() }),
      putBlob: async (_t: string, data: string) => {
        const hash = 'h'.repeat(52) + String(this.blobs.size).padStart(12, '0')
        this.blobs.set(hash, data)
        return { hash, usage: this.usage() }
      },
      getBlob: async (_t: string, hash: string) => ({ data: this.blobs.get(hash) ?? '' }),
      deleteBlob: async (_t: string, hash: string) => {
        this.blobs.delete(hash)
        return { usage: this.usage() }
      }
    } as unknown as SyncApiClient
  }
}

function fakeFiles(): SyncFiles & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    dir: '/docs',
    readBase64: async (p) => store.get(p) ?? '',
    writeBase64: async (p, d) => {
      store.set(p, d)
    },
    remove: async (p) => {
      store.delete(p)
    }
  }
}

async function freshDb(): Promise<DB> {
  const db = open({ name: `test-sync-${Math.random()}.db`, location: ':memory:' })
  db.executeSync('PRAGMA foreign_keys = ON')
  await runMigrations(db)
  await db.execute(
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (?, '09120000000', 'REF00001', '2026-10-24', '2026-10-24')`,
    [USER]
  )
  return db
}

async function addProperty(db: DB, id: string, title: string): Promise<void> {
  await db.execute(
    `INSERT INTO properties (id, owner_id, title, city, address, created_at, updated_at)
     VALUES (?, ?, ?, 'تهران', 'ولیعصر', '2026-10-24', '2026-10-24')`,
    [id, USER, title]
  )
}

async function addContact(db: DB, id: string, name: string): Promise<void> {
  await db.execute(
    `INSERT INTO contacts (id, user_id, full_name, phone_number, created_at, updated_at)
     VALUES (?, ?, ?, '09121111111', '2026-10-24', '2026-10-24')`,
    [id, USER, name]
  )
}

async function count(db: DB, table: string): Promise<number> {
  const r = await db.execute(`SELECT COUNT(*) AS n FROM ${table}`)
  return Number(r.rows[0]?.n ?? 0)
}

describe('SyncService (AZAR-SYNC-001)', () => {
  let db: DB
  let server: FakeServer
  let files: ReturnType<typeof fakeFiles>
  let sync: SyncService

  beforeEach(async () => {
    db = await freshDb()
    server = new FakeServer()
    files = fakeFiles()
    sync = new SyncService(db, server.api(), files)
  })

  afterEach(() => {
    db.close()
  })

  it('sends the files an existing user already had on the phone on the first sync', async () => {
    await addProperty(db, 'p1', 'آپارتمان')
    await addContact(db, 'c1', 'علی')
    await db.execute('DELETE FROM sync_outbox') // as if they were made before this version
    expect(await sync.pendingCount()).toBe(1)

    await sync.push(TOKEN, USER)

    expect(server.rows.get('properties/p1')?.row?.title).toBe('آپارتمان')
    expect(server.rows.get('contacts/c1')?.row?.full_name).toBe('علی')
    expect(await sync.pendingCount()).toBe(0)
    expect(await sync.owner()).toBe(USER)
  })

  it('queues every edit and delete and sends each row once', async () => {
    await sync.push(TOKEN, USER)
    await addProperty(db, 'p1', 'اول')
    await db.execute("UPDATE properties SET title = 'دوم' WHERE id = 'p1'")
    await addContact(db, 'c1', 'علی')
    expect(await sync.pendingCount()).toBe(2)

    await sync.push(TOKEN, USER)
    expect(server.rows.get('properties/p1')?.row?.title).toBe('دوم')

    await db.execute("DELETE FROM contacts WHERE id = 'c1'")
    await sync.push(TOKEN, USER)
    expect(server.rows.has('contacts/c1')).toBe(false)
    expect(await sync.pendingCount()).toBe(0)
  })

  it('keeps changes queued while offline', async () => {
    await sync.push(TOKEN, USER)
    await addProperty(db, 'p1', 'آفلاین')
    server.revoked = true
    await expect(sync.push(TOKEN, USER)).rejects.toBeInstanceOf(SessionRevokedError)
    expect(await sync.pendingCount()).toBe(1)
    server.revoked = false
    await sync.push(TOKEN, USER)
    expect(await sync.pendingCount()).toBe(0)
  })

  it('brings everything back on a new phone, profile photo included', async () => {
    await addProperty(db, 'p1', 'آپارتمان')
    await addContact(db, 'c1', 'علی')
    files.store.set('/docs/profile/me.webp', 'UEhPVE8=')
    await db.execute(
      "INSERT INTO application_settings (key, value, updated_at) VALUES ('profile_photo', '/docs/profile/me.webp', '2026-10-24')"
    )
    await db.execute(
      "INSERT INTO application_settings (key, value, updated_at) VALUES ('display_name', 'نوید', '2026-10-24')"
    )
    await sync.push(TOKEN, USER)
    expect(server.rows.get('application_settings/profile_photo')?.row?.value).toMatch(/^blob:/)

    const phone2 = await freshDb()
    const files2 = fakeFiles()
    const sync2 = new SyncService(phone2, server.api(), files2)
    await sync2.restore(TOKEN, USER)

    expect(await count(phone2, 'properties')).toBe(1)
    expect(await count(phone2, 'contacts')).toBe(1)
    const photo = await phone2.execute("SELECT value FROM application_settings WHERE key = 'profile_photo'")
    const path = String(photo.rows[0]?.value)
    expect(path.startsWith('/docs/profile/photo-')).toBe(true)
    expect(files2.store.get(path)).toBe('UEhPVE8=')
    // restoring is not a change to send back
    expect(await sync2.pendingCount()).toBe(0)
    phone2.close()
  })

  it('removes every file from the phone on sign-out, and they stay on the server', async () => {
    await addProperty(db, 'p1', 'آپارتمان')
    await addContact(db, 'c1', 'علی')
    await sync.push(TOKEN, USER)

    await sync.wipe()

    expect(await count(db, 'properties')).toBe(0)
    expect(await count(db, 'contacts')).toBe(0)
    expect(await sync.pendingCount()).toBe(0)
    expect(await sync.owner()).toBeNull()
    expect(server.rows.has("properties/p1") && server.rows.has("contacts/c1")).toBe(true)
    expect(await count(db, "lost_reasons")).toBeGreaterThan(0)
  })
})
