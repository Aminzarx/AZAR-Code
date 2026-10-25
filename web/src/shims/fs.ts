/**
 * EYVAN web: react-native-fs → a small file store. Files under DocumentDirectoryPath are sealed into IndexedDB;
 * CachesDirectoryPath lives in memory for this tab only. Downloads (app updates) do not exist on the web.
 */
import { Buffer } from 'buffer'
import { idb, seal, unseal } from './idb'

const DocumentDirectoryPath = '/documents'
const CachesDirectoryPath = '/caches'
const memory = new Map<string, Uint8Array>()
const kept = (path: string) => path.startsWith(DocumentDirectoryPath + '/')
const at = (path: string) => `fs:${path}`

type Encoding = 'utf8' | 'base64' | 'ascii' | undefined

function encode(content: string, encoding: Encoding): Uint8Array {
  return encoding === 'base64' ? new Uint8Array(Buffer.from(content, 'base64')) : new TextEncoder().encode(content)
}

async function load(path: string): Promise<Uint8Array | undefined> {
  if (memory.has(path)) return memory.get(path)
  if (!kept(path)) return undefined
  const sealed = await idb.get<Uint8Array>(at(path))
  if (!sealed) return undefined
  const data = await unseal(sealed)
  memory.set(path, data)
  return data
}

async function store(path: string, data: Uint8Array) {
  memory.set(path, data)
  if (kept(path)) await idb.set(at(path), await seal(data))
}

/** start-up: the kept files (the profile photo) into memory, so a picture can be shown without waiting */
export async function initFs(): Promise<void> {
  for (const key of await idb.keys(at(DocumentDirectoryPath + '/'))) {
    const sealed = await idb.get<Uint8Array>(key)
    if (!sealed) continue
    try {
      memory.set(key.slice(3), await unseal(sealed))
    } catch {
      await idb.delete(key)
    }
  }
}

/** a kept image as a data: address, or null (synchronous: from memory) */
export function peekDataUri(path: string, type = 'image/webp'): string | null {
  const data = memory.get(path)
  return data ? `data:${type};base64,${Buffer.from(data).toString('base64')}` : null
}

function missing(path: string) {
  return Object.assign(new Error(`ENOENT: no such file or directory, ${path}`), { code: 'ENOENT' })
}

async function readFile(path: string, encoding?: Encoding): Promise<string> {
  const data = await load(path)
  if (!data) throw missing(path)
  return encoding === 'base64' ? Buffer.from(data).toString('base64') : new TextDecoder().decode(data)
}

async function writeFile(path: string, content: string, encoding?: Encoding): Promise<void> {
  await store(path, encode(content, encoding))
}

async function exists(path: string): Promise<boolean> {
  if (await load(path)) return true
  const prefix = path.endsWith('/') ? path : path + '/'
  return [...memory.keys()].some((k) => k.startsWith(prefix)) || (kept(prefix) && (await idb.keys(at(prefix))).length > 0)
}

async function unlink(path: string): Promise<void> {
  const prefix = path.endsWith('/') ? path : path + '/'
  for (const k of [...memory.keys()]) if (k === path || k.startsWith(prefix)) memory.delete(k)
  if (kept(path) || kept(prefix)) {
    await idb.delete(at(path))
    for (const k of await idb.keys(at(prefix))) await idb.delete(k)
  }
}

async function moveFile(from: string, to: string): Promise<void> {
  const data = await load(from)
  if (!data) throw missing(from)
  await store(to, data)
  await unlink(from)
}

async function stat(path: string) {
  const data = await load(path)
  if (!data) throw missing(path)
  return { path, size: data.length, isFile: () => true, isDirectory: () => false, mtime: new Date(), ctime: new Date() }
}

async function readDir(dir: string) {
  const prefix = dir.endsWith('/') ? dir : dir + '/'
  const names = new Set([...memory.keys()].filter((k) => k.startsWith(prefix)))
  if (kept(prefix)) (await idb.keys(at(prefix))).forEach((k) => names.add(k.slice(3)))
  return [...names]
    .filter((p) => !p.slice(prefix.length).includes('/'))
    .map((path) => ({ path, name: path.slice(prefix.length), size: memory.get(path)?.length ?? 0, isFile: () => true, isDirectory: () => false }))
}

async function hash(path: string, algorithm: string): Promise<string> {
  const data = await load(path)
  if (!data) throw missing(path)
  const name = algorithm.toLowerCase() === 'sha256' ? 'SHA-256' : algorithm.toUpperCase()
  return Buffer.from(await crypto.subtle.digest(name, data)).toString('hex')
}

const mkdir = async (_path: string) => undefined
const downloadFile = () => ({ jobId: -1, promise: Promise.reject(new Error('downloads are not available on the web')) })

export default {
  DocumentDirectoryPath,
  CachesDirectoryPath,
  readFile,
  writeFile,
  exists,
  unlink,
  moveFile,
  stat,
  readDir,
  hash,
  mkdir,
  downloadFile
}
