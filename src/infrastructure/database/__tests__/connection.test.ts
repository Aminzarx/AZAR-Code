import * as fs from 'node:fs'
import * as path from 'node:path'
import { open } from '@op-engineering/op-sqlite'
import { getDatabase, getDeviceStore, closeDatabase, wasDatabaseFreshlyCreated } from '../connection'
import { runMigrations } from '../migrationRunner'

const LEGACY_FILE = path.join(process.cwd(), `azar.test-${process.env.JEST_WORKER_ID}.db`)
const STORE_FILE = path.join(process.cwd(), `azar-store.test-${process.env.JEST_WORKER_ID}.db`)

function removeFiles(): void {
  closeDatabase()
  for (const file of [LEGACY_FILE, STORE_FILE]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  }
}

describe('connection', () => {
  // other test files on the same Jest worker share these file names
  beforeEach(removeFiles)
  afterEach(removeFiles)

  it('returns the same connection instance on repeated calls (singleton)', async () => {
    const first = await getDatabase()
    const second = await getDatabase()
    expect(first).toBe(second)
  })

  it('enables foreign key enforcement on open', async () => {
    const db = await getDatabase()
    const result = await db.executeRaw('PRAGMA foreign_keys')
    expect(result.rawRows[0]?.[0]).toBe(1)
  })

  it('returns a usable connection after being reopened following a close', async () => {
    const first = await getDatabase()
    closeDatabase()
    const second = await getDatabase()
    expect(second).not.toBe(first)
    await expect(second.execute('SELECT 1')).resolves.toBeTruthy()
  })

  // Amin #4826 (option A)
  it('keeps no database of the files on disk, only the encrypted store; the phone settings survive a restart', async () => {
    const db = await getDatabase()
    expect(wasDatabaseFreshlyCreated()).toBe(true)
    expect(fs.existsSync(LEGACY_FILE)).toBe(false)
    expect(fs.existsSync(STORE_FILE)).toBe(true)
    await db.execute("INSERT INTO application_settings (key, value, updated_at) VALUES ('theme', 'dark', '2026-10-24')")
    closeDatabase()

    const again = await getDatabase()
    expect(wasDatabaseFreshlyCreated()).toBe(false)
    const theme = await again.execute("SELECT value FROM application_settings WHERE key = 'theme'")
    expect(theme.rows[0]?.value).toBe('dark')
  })

  it('takes over the database earlier versions kept on disk and deletes it', async () => {
    const legacy = open({ name: path.basename(LEGACY_FILE), location: process.cwd() })
    await runMigrations(legacy)
    await legacy.execute("INSERT INTO application_settings (key, value, updated_at) VALUES ('theme', 'light', '2026-10-24')")
    legacy.close()

    const db = await getDatabase()
    expect(fs.existsSync(LEGACY_FILE)).toBe(false)
    expect(wasDatabaseFreshlyCreated()).toBe(false)
    const theme = await db.execute("SELECT value FROM application_settings WHERE key = 'theme'")
    expect(theme.rows[0]?.value).toBe('light')
  })

  it('every write through the connection is in the encrypted store before the caller goes on', async () => {
    const db = await getDatabase()
    const store = await getDeviceStore()
    await store.setOwner('user-1')
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES ('user-1', '09120000000', 'REF00001', '2026-10-24', '2026-10-24')`
    )
    await db.execute(
      `INSERT INTO contacts (id, user_id, full_name, phone_number, created_at, updated_at)
       VALUES ('c1', 'user-1', 'علی', '09121111111', '2026-10-24', '2026-10-24')`
    )
    expect(await store.count('user-1')).toBe(1)
    // the store's own work through the same connection does not wait on itself
    await store.persistFrom(db)
    closeDatabase()

    const again = await getDatabase()
    const contacts = await again.execute('SELECT full_name FROM contacts')
    expect(contacts.rows.map((r) => r.full_name)).toEqual(['علی'])
  })
})
