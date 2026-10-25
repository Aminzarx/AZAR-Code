/**
 * EYVAN web: @op-engineering/op-sqlite → sql.js (SQLite compiled to WebAssembly).
 * - `location: ':memory:'` (the working database) lives in memory only, exactly as on the phone (option A).
 * - A named database (the device store) is loaded at start-up and written back, sealed with the device key, after
 *   every change (debounced, and at once when the page is hidden). The `encryptionKey` the app passes is not needed:
 *   the browser copy is sealed by idb.ts instead of SQLCipher.
 * `initSqlite()` must finish before the app renders, so `open()` can stay synchronous as on the phone.
 */
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { idb, seal, unseal } from './idb'

export type Scalar = string | number | boolean | null | ArrayBuffer | ArrayBufferView | undefined
export type QueryResult = {
  insertId?: number
  rowsAffected: number
  rows: Array<Record<string, Scalar>>
  rawRows?: Scalar[][]
  columnNames?: string[]
}
export type Transaction = {
  execute: (query: string, params?: Scalar[]) => Promise<QueryResult>
  commit: () => Promise<QueryResult>
  rollback: () => QueryResult
}

let SQL: SqlJsStatic | null = null
const saved = new Map<string, Uint8Array>()
const at = (name: string) => `sqlite:${name}`

export async function initSqlite(): Promise<void> {
  SQL = await initSqlJs({ locateFile: () => wasmUrl })
  for (const key of await idb.keys('sqlite:')) {
    const sealed = await idb.get<Uint8Array>(key)
    if (!sealed) continue
    try {
      saved.set(key.slice('sqlite:'.length), await unseal(sealed))
    } catch {
      await idb.delete(key) // sealed with a key this browser no longer has
    }
  }
}

function bindable(params: Scalar[] = []): SqlValue[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null
    if (typeof p === 'boolean') return p ? 1 : 0
    if (p instanceof ArrayBuffer) return new Uint8Array(p)
    if (ArrayBuffer.isView(p)) return new Uint8Array(p.buffer, p.byteOffset, p.byteLength)
    return p as SqlValue
  })
}

const out = (v: SqlValue): Scalar => (v instanceof Uint8Array ? v.slice().buffer : v)

function run(db: Database, query: string, params?: Scalar[]): QueryResult {
  const results = db.exec(query, bindable(params))
  const last = results[results.length - 1]
  const columnNames = last?.columns ?? []
  const rawRows = (last?.values ?? []).map((row) => row.map(out))
  const rows = rawRows.map((row) => Object.fromEntries(columnNames.map((c, i) => [c, row[i]])))
  const rowsAffected = db.getRowsModified()
  const insertId = Number(db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? 0)
  return { rows, rawRows, columnNames, rowsAffected, insertId }
}

const pendingSaves = new Set<() => Promise<void>>()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') pendingSaves.forEach((save) => void save())
})

export function open(options: { name: string; location?: string; encryptionKey?: string }) {
  if (!SQL) throw new Error('initSqlite() has not finished')
  const inMemory = options.location === ':memory:'
  const db = new SQL.Database(inMemory ? undefined : saved.get(options.name))
  let closed = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let chain: Promise<unknown> = Promise.resolve()

  const save = async () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (closed || inMemory) return
    const data = db.export()
    saved.set(options.name, data)
    await idb.set(at(options.name), await seal(data))
  }
  const changed = () => {
    if (inMemory || closed) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void save(), 150)
  }
  if (!inMemory) pendingSaves.add(save)

  const execute = (query: string, params?: Scalar[]) => {
    const result = run(db, query, params)
    if (!/^\s*(SELECT|PRAGMA\s+\w+\s*$)/i.test(query)) changed()
    return result
  }

  if (import.meta.env.DEV) {
    const g = globalThis as { __eyvanDbs?: Record<string, Database> }
    g.__eyvanDbs = { ...g.__eyvanDbs, [options.name]: db } // dev only: look inside from the console
  }

  return {
    execute: async (query: string, params?: Scalar[]) => execute(query, params),
    executeSync: (query: string, params?: Scalar[]) => execute(query, params),
    executeRaw: async (query: string, params?: Scalar[]) => {
      const r = execute(query, params)
      return { rawRows: r.rawRows ?? [], columnNames: r.columnNames ?? [], rowsAffected: r.rowsAffected, insertId: r.insertId }
    },
    executeRawSync: (query: string, params?: Scalar[]) => {
      const r = execute(query, params)
      return { rawRows: r.rawRows ?? [], columnNames: r.columnNames ?? [], rowsAffected: r.rowsAffected, insertId: r.insertId }
    },
    executeBatch: async (commands: Array<[string, Scalar[]?]>) => {
      let rowsAffected = 0
      db.exec('BEGIN')
      try {
        for (const [query, params] of commands) rowsAffected += execute(query, params).rowsAffected
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
      return { rowsAffected }
    },
    /** one transaction at a time, like op-sqlite's queue; rolled back when the work throws */
    transaction: (work: (tx: Transaction) => Promise<void>) => {
      const next = chain.then(async () => {
        let done = false
        db.exec('BEGIN')
        const tx: Transaction = {
          execute: async (q, p) => execute(q, p),
          commit: async () => {
            if (!done) db.exec('COMMIT')
            done = true
            changed()
            return { rows: [], rowsAffected: 0 }
          },
          rollback: () => {
            if (!done) db.exec('ROLLBACK')
            done = true
            return { rows: [], rowsAffected: 0 }
          }
        }
        try {
          await work(tx)
          await tx.commit()
        } catch (e) {
          tx.rollback()
          throw e
        }
      })
      chain = next.catch(() => undefined)
      return next
    },
    close: () => {
      if (closed) return
      void save().finally(() => {
        closed = true
        pendingSaves.delete(save)
        db.close()
      })
    },
    closeAsync: async () => {
      await save()
      closed = true
      pendingSaves.delete(save)
      db.close()
    },
    delete: () => {
      closed = true
      pendingSaves.delete(save)
      db.close()
      saved.delete(options.name)
      void idb.delete(at(options.name))
    },
    interrupt: () => undefined,
    getDbPath: () => `idb:${options.name}`
  }
}

export type DB = ReturnType<typeof open>
