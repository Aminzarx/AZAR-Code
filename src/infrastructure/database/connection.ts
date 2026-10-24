import { open, type DB } from '@op-engineering/op-sqlite'
import { getOrCreateDatabaseKey } from '../security/databaseKey'
import { keychainSecureStorage } from '../security/keychainSecureStorage'
import { getSchemaVersion, runMigrations } from './migrationRunner'
import { DeviceStore, RAW_DB } from './deviceStore'

// Jest runs test files in separate workers; suffixing the file names with
// JEST_WORKER_ID keeps each worker on its own files (never set outside Jest).
const SUFFIX = process.env.AZAR_TEST_DB_TAG
  ? `.test-${process.env.AZAR_TEST_DB_TAG}` // one per test file (jest.setup.js)
  : process.env.JEST_WORKER_ID
    ? `.test-${process.env.JEST_WORKER_ID}`
    : ''
/** the encrypted on-disk store: device rows + unsent changes only (deviceStore.ts) */
const STORE_NAME = `azar-store${SUFFIX}.db`
/** where versions before option A kept every file on disk; taken over and deleted on the first launch */
const LEGACY_NAME = `azar${SUFFIX}.db`

let instance: DB | null = null
let deviceStore: DeviceStore | null = null
let wasFreshlyCreated = false
let openPromise: Promise<DB> | null = null
/** bumped by closeDatabase(), so an open still under way when it runs lets go of what it opened */
let generation = 0

/**
 * Opens (or returns the already-open) working database.
 *
 * Amin #4826 (option A): the files are never kept on the phone. The working database every repository reads is
 * an in-memory SQLite database, filled from the server at sign-in (SyncService.restore) and gone when the app
 * closes. The only thing on disk is the small SQLCipher store (key held exclusively in platform secure storage,
 * `getOrCreateDatabaseKey`): this phone's own rows (session, settings) and the changes not on the server yet.
 * Every write through the returned connection is followed by `persistFrom`, so no repository has to know.
 *
 * Foreign keys are turned on and migrations run here, the one place every caller goes through. Concurrent
 * callers on launch await the same open (the in-progress promise is cached, not just the instance).
 */
export async function getDatabase(): Promise<DB> {
  if (instance) {
    return instance
  }
  if (openPromise) {
    return openPromise
  }

  const opening = generation
  openPromise = (async () => {
    const encryptionKey = await getOrCreateDatabaseKey(keychainSecureStorage)
    const store = new DeviceStore(open({ name: STORE_NAME, encryptionKey }))
    const storeIsNew = await store.init()

    const db = open({ name: 'azar-working', location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)

    const hadLegacy = await takeOverLegacyDatabase(encryptionKey, store)
    await store.loadInto(db)
    if (opening !== generation) {
      // closeDatabase() ran meanwhile: this open must not hold the store file behind its back
      db.close()
      store.close()
      throw new Error('The database was closed while it was opening.')
    }
    wasFreshlyCreated = storeIsNew && !hadLegacy
    deviceStore = store
    instance = persisting(db, store)
    return instance
  })()

  const mine = openPromise
  try {
    return await mine
  } finally {
    if (openPromise === mine) openPromise = null
  }
}

/** The encrypted on-disk store behind the working database (open after `getDatabase()`). */
export async function getDeviceStore(): Promise<DeviceStore> {
  await getDatabase()
  return deviceStore as DeviceStore
}

/**
 * The working database, with every write followed by moving what it noted to the encrypted store. Reads go
 * straight through; nothing else about the connection changes.
 */
function persisting(db: DB, store: DeviceStore): DB {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === RAW_DB) return target
      if (prop === 'execute') {
        return async (query: string, params?: never[]) => {
          const result = await target.execute(query, params)
          if (!/^\s*(SELECT|PRAGMA)/i.test(query)) await store.persistFrom(target)
          return result
        }
      }
      if (prop === 'transaction') {
        return async (work: Parameters<DB['transaction']>[0]) => {
          const result = await target.transaction(work)
          await store.persistFrom(target)
          return result
        }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

/**
 * Versions before option A kept the whole database on disk. If it is there, everything in it goes into the store
 * (files as unsent changes, which reach the server with the next push and then leave the phone) and the file is
 * deleted. Opening the name creates an empty file when there was none; that one is deleted as well.
 */
async function takeOverLegacyDatabase(encryptionKey: string, store: DeviceStore): Promise<boolean> {
  const legacy = open({ name: LEGACY_NAME, encryptionKey })
  try {
    const found = (await getSchemaVersion(legacy)) > 0
    if (found) {
      await runMigrations(legacy)
      // the signed-in account (SessionManager's keychain key) owns those files
      await store.takeOver(legacy, await keychainSecureStorage.get('azar.session-token.user-id'))
    }
    return found
  } finally {
    legacy.delete()
  }
}

/**
 * True if the database this session opened had no prior schema (a real
 * fresh install, not just an app restart) — set once per process, right
 * after the first `getDatabase()` call runs migrations from version 0.
 * Callers outside this module (e.g. calendar-reminder cleanup on
 * reinstall) use this instead of duplicating fresh-install detection.
 */
export function wasDatabaseFreshlyCreated(): boolean {
  return wasFreshlyCreated
}

/**
 * Closes the connection and clears the cached instance. Primarily for
 * test teardown; the running app keeps a single connection open for its
 * lifetime.
 */
export function closeDatabase(): void {
  generation += 1
  openPromise = null
  instance?.close()
  instance = null
  deviceStore?.close()
  deviceStore = null
}
