import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { DeviceStore } from '../../database/deviceStore'
import { SyncService, type SyncFiles } from '../SyncService'
import {
  SessionRevokedError,
  type PullResult,
  type SyncApiClient,
  type SyncChange,
  type SyncUsage
} from '../syncApiClient'

const USER = 'user-1'
const OTHER = 'user-2'
const TOKEN = 'tok'

/** The server side of AZAR-SYNC-001, kept in memory. */
class FakeServer {
  rows = new Map<string, SyncChange>()
  blobs = new Map<string, string>()
  revoked = false
  offline = false
  pushes = 0

  private usage(): SyncUsage {
    return { bytes: this.rows.size, quotaBytes: 50_000_000, tokens: 0 }
  }

  private check(): void {
    if (this.offline) throw new Error('offline')
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
        this.check()
        // like the server: named by its content, so the same photo sent twice is stored once
        const hash = [...data].map((ch) => ch.charCodeAt(0).toString(16)).join('').padEnd(64, '0').slice(0, 64)
        this.blobs.set(hash, data)
        return { hash, usage: this.usage() }
      },
      getBlob: async (_t: string, hash: string) => ({ data: this.blobs.get(hash) ?? '' }),
      deleteBlob: async (_t: string, hash: string) => {
        this.blobs.delete(hash)
        return { usage: this.usage() }
      },
      tokenLedger: async () => {
        this.check()
        return {
          summary: { balance: 6340, allowance: 6350, earned: 0, bought: 0, spent: 10 },
          rows: [{ at: '2026-10-24T10:00:00Z', reason: 'file_spend', amount: -10 }],
          settings: { tokensPerKb: 0.127, phoneChangeTokens: null, packsOn: false }
        }
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

async function workingDb(): Promise<DB> {
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

/**
 * One launch of the app (connection.ts): a fresh in-memory working database, filled from the phone's encrypted
 * store. Pass the store of an earlier launch to model closing and reopening the app.
 */
async function launch(server: FakeServer, files = fakeFiles(), storeDb?: DB) {
  const disk = storeDb ?? open({ name: `test-store-${Math.random()}.db`, location: ':memory:' })
  const store = new DeviceStore(disk)
  await store.init()
  const db = await workingDb()
  await store.loadInto(db)
  return { db, store, disk, files, sync: new SyncService(db, store, server.api(), files) }
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

/** what is on the phone's disk of the files: the queue of the encrypted store */
async function queuedOnDisk(disk: DB): Promise<number> {
  return count(disk, 'queue')
}

describe('SyncService, option A (Amin #4826)', () => {
  let server: FakeServer

  beforeEach(() => {
    server = new FakeServer()
  })

  it('sends each edit and delete once, and a sent change leaves the phone', async () => {
    const { db, disk, sync } = await launch(server)
    await sync.claim(USER)
    await addProperty(db, 'p1', 'اول')
    await db.execute("UPDATE properties SET title = 'دوم' WHERE id = 'p1'")
    await addContact(db, 'c1', 'علی')
    expect(await sync.pendingCount()).toBe(2)
    expect(await queuedOnDisk(disk)).toBeGreaterThan(0)

    await sync.push(TOKEN, USER)
    expect(server.rows.get('properties/p1')?.row?.title).toBe('دوم')
    expect(await queuedOnDisk(disk)).toBe(0)

    await db.execute("DELETE FROM contacts WHERE id = 'c1'")
    await sync.push(TOKEN, USER)
    expect(server.rows.has('contacts/c1')).toBe(false)
    expect(await sync.pendingCount()).toBe(0)
    expect(await queuedOnDisk(disk)).toBe(0)
  })

  it('keeps nothing of the files on the phone between launches; they come from the server', async () => {
    const first = await launch(server)
    await first.sync.claim(USER)
    await addProperty(first.db, 'p1', 'آپارتمان')
    await first.sync.push(TOKEN, USER)
    first.db.close()

    const next = await launch(server, fakeFiles(), first.disk)
    expect(await count(next.db, 'properties')).toBe(0) // nothing came from the disk
    expect(next.sync.loaded).toBe(false)
    await next.sync.restore(TOKEN, USER)
    expect(next.sync.loaded).toBe(true)
    expect(await count(next.db, 'properties')).toBe(1)
    expect(await queuedOnDisk(next.disk)).toBe(0)
  })

  it('offline: only what was made offline shows; online it goes to the server and leaves the phone', async () => {
    const first = await launch(server)
    await first.sync.claim(USER)
    await addProperty(first.db, 'p1', 'قبلی')
    await first.sync.push(TOKEN, USER)
    first.db.close()

    server.offline = true
    const offline = await launch(server, fakeFiles(), first.disk)
    await expect(offline.sync.restore(TOKEN, USER)).rejects.toThrow('offline')
    await addProperty(offline.db, 'p2', 'آفلاین')
    expect(await offline.sync.pendingCount()).toBe(1)
    offline.db.close() // the app is closed while still offline

    const again = await launch(server, fakeFiles(), first.disk)
    const titles = await again.db.execute('SELECT title FROM properties')
    expect(titles.rows.map((r) => r.title)).toEqual(['آفلاین'])

    server.offline = false
    await again.sync.push(TOKEN, USER)
    await again.sync.restore(TOKEN, USER)
    expect(await count(again.db, 'properties')).toBe(2)
    expect(await queuedOnDisk(again.disk)).toBe(0)
    expect(server.rows.get('properties/p2')?.row?.title).toBe('آفلاین')
  })

  it("the phone's own rows stay between launches; the account's files do not", async () => {
    const first = await launch(server)
    await first.db.execute(
      "INSERT INTO application_settings (key, value, updated_at) VALUES ('theme', 'dark', '2026-10-24')"
    )
    await first.db.execute(
      "INSERT INTO application_settings (key, value, updated_at) VALUES ('display_name', 'نوید', '2026-10-24')"
    )
    await first.store.persistFrom(first.db)
    first.db.close()

    const next = await launch(server, fakeFiles(), first.disk)
    const rows = await next.db.execute("SELECT key FROM application_settings WHERE key IN ('theme', 'display_name')")
    expect(rows.rows.map((r) => r.key)).toEqual(['theme'])
  })

  it('Amin #5040: the profile name and agency stay on the phone for the account, so they show offline', async () => {
    const setting = (db: DB, key: string, value: string) =>
      db.execute(
        "INSERT OR REPLACE INTO application_settings (key, value, updated_at) VALUES (?, ?, '2026-10-24')",
        [key, value]
      )
    const name = async (db: DB) =>
      (await db.execute("SELECT value FROM application_settings WHERE key = 'display_name'")).rows[0]?.value ?? null

    const first = await launch(server)
    await first.sync.claim(USER)
    await setting(first.db, 'display_name', 'نوید')
    await setting(first.db, 'agency_name', 'املاک خیام')
    first.files.store.set('/docs/profile/me.webp', 'UEhPVE8=')
    await setting(first.db, 'profile_photo', '/docs/profile/me.webp')
    await first.sync.push(TOKEN, USER)
    first.db.close()

    server.offline = true
    const offline = await launch(server, fakeFiles(), first.disk)
    await expect(offline.sync.restore(TOKEN, USER)).rejects.toThrow('offline')
    expect(await name(offline.db)).toBe('نوید')
    const kept = await offline.db.execute(
      "SELECT key FROM application_settings WHERE key IN ('display_name', 'agency_name', 'profile_photo') ORDER BY key"
    )
    expect(kept.rows.map((r) => r.key)).toEqual(['agency_name', 'display_name']) // the photo is not kept
    expect(await offline.sync.pendingCount()).toBe(0) // the kept name is not a new change

    // a name changed on another phone comes with the next restore and is kept from then on
    server.offline = false
    server.rows.set('application_settings/display_name', {
      t: 'application_settings',
      k: 'display_name',
      row: { key: 'display_name', value: 'نوید بیاتی', updated_at: '2026-10-25' }
    } as never)
    await offline.sync.restore(TOKEN, USER)
    offline.db.close()
    server.offline = true
    const later = await launch(server, fakeFiles(), first.disk)
    expect(await name(later.db)).toBe('نوید بیاتی')

    // another number never sees it; back to the first number, it shows again
    await later.sync.claim(OTHER)
    expect(await name(later.db)).toBeNull()
    await later.sync.claim(USER)
    expect(await name(later.db)).toBe('نوید بیاتی')

    // sign-out takes it off the phone
    await later.sync.wipe()
    later.db.close()
    const afterSignOut = await launch(server, fakeFiles(), first.disk)
    expect(await name(afterSignOut.db)).toBeNull()
  })

  it('brings the files and the profile photo to a new phone', async () => {
    const a = await launch(server)
    await a.sync.claim(USER)
    await addProperty(a.db, 'p1', 'آپارتمان')
    await addContact(a.db, 'c1', 'علی')
    a.files.store.set('/docs/profile/me.webp', 'UEhPVE8=')
    await a.db.execute(
      "INSERT INTO application_settings (key, value, updated_at) VALUES ('profile_photo', '/docs/profile/me.webp', '2026-10-24')"
    )
    await a.sync.push(TOKEN, USER)
    expect(server.rows.get('application_settings/profile_photo')?.row?.value).toMatch(/^blob:/)

    const b = await launch(server)
    await b.sync.claim(USER)
    await b.sync.restore(TOKEN, USER)
    expect(await count(b.db, 'properties')).toBe(1)
    expect(await count(b.db, 'contacts')).toBe(1)
    const photo = await b.db.execute("SELECT value FROM application_settings WHERE key = 'profile_photo'")
    const path = String(photo.rows[0]?.value)
    expect(path.startsWith('/docs/profile/photo-')).toBe(true)
    expect(b.files.store.get(path)).toBe('UEhPVE8=')
    // what came from the server is not a change to send back
    expect(await b.sync.pendingCount()).toBe(0)
  })

  it('sign-out leaves nothing of the files on the phone; they stay on the server', async () => {
    const { db, disk, sync } = await launch(server)
    await sync.claim(USER)
    await addProperty(db, 'p1', 'آپارتمان')
    await sync.push(TOKEN, USER)
    await addContact(db, 'c1', 'نفرستاده')
    await sync.pendingCount()

    await sync.wipe()

    expect(await count(db, 'properties')).toBe(0)
    expect(await count(db, 'contacts')).toBe(0)
    expect(await queuedOnDisk(disk)).toBe(0)
    expect(await sync.owner()).toBeNull()
    expect(server.rows.has('properties/p1')).toBe(true)
    expect(await count(db, 'lost_reasons')).toBeGreaterThan(0)
  })

  it("another number on the phone sees none of the first number's files; its unsent changes wait for it", async () => {
    const { db, disk, sync } = await launch(server)
    await sync.claim(USER)
    server.offline = true
    await addProperty(db, 'p1', 'نفرستاده')
    await sync.pendingCount()

    await sync.claim(OTHER)
    expect(await count(db, 'properties')).toBe(0)
    expect(await queuedOnDisk(disk)).toBe(1)

    await sync.claim(USER)
    expect(await count(db, 'properties')).toBe(1)
  })

  it('a revoked session keeps unsent changes queued', async () => {
    const { db, sync } = await launch(server)
    await sync.claim(USER)
    await addProperty(db, 'p1', 'آفلاین')
    server.revoked = true
    await expect(sync.push(TOKEN, USER)).rejects.toBeInstanceOf(SessionRevokedError)
    expect(await sync.pendingCount()).toBe(1)
    server.revoked = false
    await sync.push(TOKEN, USER)
    expect(await sync.pendingCount()).toBe(0)
  })

  it('the database of earlier versions moves to the server and is gone from the phone', async () => {
    const legacy = await workingDb()
    await addProperty(legacy, 'p1', 'قدیمی')
    await addContact(legacy, 'c1', 'علی')
    await legacy.execute("INSERT INTO application_settings (key, value, updated_at) VALUES ('theme', 'dark', '2026-10-24')")

    const disk = open({ name: `test-store-${Math.random()}.db`, location: ':memory:' })
    const store = new DeviceStore(disk)
    await store.init()
    await store.takeOver(legacy, USER)
    legacy.close()

    const { db, sync } = await launch(server, fakeFiles(), disk)
    expect(await count(db, 'properties')).toBe(1) // shown at once, even before it is sent
    const theme = await db.execute("SELECT value FROM application_settings WHERE key = 'theme'")
    expect(theme.rows[0]?.value).toBe('dark')
    await sync.push(TOKEN, USER)
    expect(server.rows.get('properties/p1')?.row?.title).toBe('قدیمی')
    expect(server.rows.get('contacts/c1')?.row?.full_name).toBe('علی')
    expect(await queuedOnDisk(disk)).toBe(0)
  })
})

describe('file and contract photos (Amin #5062)', () => {
  const { PhotoRepository } = require('../../database/repositories/PhotoRepository') as typeof import('../../database/repositories/PhotoRepository')
  let n = 0
  const ids = (): string => `photo-${++n}`

  it('a queued photo goes up as a blob first; the row carries only the hash and the phone lets go of the bytes', async () => {
    const server = new FakeServer()
    const app = await launch(server)
    await app.sync.claim(USER)
    await addProperty(app.db, 'p1', 'آپارتمان')
    const photos = new PhotoRepository(app.db, ids)
    await photos.replaceFor(USER, 'property', 'p1', [
      { data: 'AAAA', bytes: 3, width: 4, height: 3 },
      { data: 'BBBB', bytes: 3, width: 4, height: 3 }
    ])

    await app.sync.push(TOKEN, USER)

    expect([...server.blobs.values()].sort()).toEqual(['AAAA', 'BBBB'])
    const sent = [...server.rows.values()].filter((c) => c.t === 'photos')
    expect(sent).toHaveLength(2)
    for (const c of sent) {
      expect(c.row?.data).toBeNull()
      expect(server.blobs.has(String(c.row?.blob_hash))).toBe(true)
    }
    const local = await photos.listFor('property', 'p1')
    expect(local.map((p) => p.data)).toEqual([null, null])
    expect(local.every((p) => p.blobHash)).toBe(true)
    // still shown from the server (and kept in memory for this run)
    expect(await app.sync.loadPhoto(TOKEN, local[0]!)).toBe('AAAA')
    expect(await app.sync.pendingCount()).toBe(0)
  })

  it('a photo made offline waits, encrypted, in the queue and survives a restart until it is sent', async () => {
    const server = new FakeServer()
    server.offline = true
    const first = await launch(server)
    await first.sync.claim(USER)
    await addProperty(first.db, 'p1', 'آپارتمان')
    await new PhotoRepository(first.db, ids).replaceFor(USER, 'property', 'p1', [
      { data: 'CCCC', bytes: 3, width: 4, height: 3 }
    ])
    await expect(first.sync.push(TOKEN, USER)).rejects.toThrow()

    const again = await launch(server, first.files, first.disk)
    const waiting = await new PhotoRepository(again.db, ids).listFor('property', 'p1')
    expect(waiting.map((p) => p.data)).toEqual(['CCCC'])

    server.offline = false
    await again.sync.push(TOKEN, USER)
    expect([...server.blobs.values()]).toEqual(['CCCC'])
  })

  it('removing a photo, or deleting its file, gives its server copy (and tokens) back on the next push', async () => {
    const server = new FakeServer()
    const app = await launch(server)
    await app.sync.claim(USER)
    await addProperty(app.db, 'p1', 'آپارتمان')
    const photos = new PhotoRepository(app.db, ids)
    await photos.replaceFor(USER, 'property', 'p1', [
      { data: 'AAAA', bytes: 3, width: 4, height: 3 },
      { data: 'BBBB', bytes: 3, width: 4, height: 3 }
    ])
    await app.sync.push(TOKEN, USER)
    const [first, second] = await photos.listFor('property', 'p1')

    // keep only the second, now first
    await photos.replaceFor(USER, 'property', 'p1', [{ id: second!.id, bytes: second!.bytes }])
    await app.sync.push(TOKEN, USER)
    expect([...server.blobs.values()]).toEqual(['BBBB'])
    expect((await photos.listFor('property', 'p1')).map((p) => [p.id, p.position])).toEqual([[second!.id, 0]])
    expect(server.rows.has(`photos/${first!.id}`)).toBe(false)

    const { PropertyRepository } = require('../../database/repositories/PropertyRepository') as typeof import('../../database/repositories/PropertyRepository')
    await new PropertyRepository(app.db).delete('p1')
    await app.sync.push(TOKEN, USER)
    expect(server.blobs.size).toBe(0)
    expect([...server.rows.keys()].filter((k) => k.startsWith('photos/'))).toEqual([])
  })
})

describe('token ledger (Amin #5052)', () => {
  it('kept on the phone for offline, gone on sign-out', async () => {
    const server = new FakeServer()
    const app = await launch(server)
    await app.sync.claim(USER)
    expect((await app.sync.tokenLedger(TOKEN))?.fresh).toBe(true)

    server.offline = true
    const offline = await app.sync.tokenLedger(TOKEN)
    expect(offline?.fresh).toBe(false)
    expect(offline?.ledger.summary.balance).toBe(6340)

    await app.sync.wipe()
    expect(await app.sync.tokenLedger(TOKEN)).toBeNull()
  })
})
