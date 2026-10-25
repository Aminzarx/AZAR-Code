/**
 * EYVAN web: one small IndexedDB key-value store for everything the phone app keeps on disk (secure storage, the
 * encrypted device store, the app's own files). Values are stored as given (strings, bytes, CryptoKeys).
 */
const DB_NAME = 'eyvan'
const STORE = 'kv'
let opening: Promise<IDBDatabase> | null = null

function database(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return opening
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = work(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export const idb = {
  get: <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key)).then(() => undefined),
  delete: (key: string) => run('readwrite', (s) => s.delete(key)).then(() => undefined),
  keys: (prefix: string) =>
    run<IDBValidKey[]>('readonly', (s) => s.getAllKeys(IDBKeyRange.bound(prefix, prefix + '￿'))).then((k) =>
      k.map(String)
    )
}

/**
 * The device key: AES-GCM, made in the browser and stored non-extractable, so a script can use it here but never read
 * it out. Everything this app writes to the browser's disk is sealed with it.
 */
let deviceKey: Promise<CryptoKey> | null = null
function key(): Promise<CryptoKey> {
  deviceKey ??= (async () => {
    const found = await idb.get<CryptoKey>('device-key')
    if (found) return found
    const made = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await idb.set('device-key', made)
    return made
  })()
  return deviceKey
}

export async function seal(data: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), data))
  const out = new Uint8Array(12 + body.length)
  out.set(iv)
  out.set(body, 12)
  return out
}

export async function unseal(sealed: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.subarray(0, 12) }, await key(), sealed.subarray(12))
  )
}
