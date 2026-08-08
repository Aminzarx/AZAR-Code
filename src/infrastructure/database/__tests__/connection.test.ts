import * as fs from 'node:fs'
import * as path from 'node:path'
import { getDatabase, closeDatabase } from '../connection'

const DB_FILE = path.join(process.cwd(), 'azar.db')

describe('connection', () => {
  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE)
    }
  })

  it('returns the same connection instance on repeated calls (singleton)', () => {
    const first = getDatabase()
    const second = getDatabase()
    expect(first).toBe(second)
  })

  it('enables foreign key enforcement on open', async () => {
    const db = getDatabase()
    const result = await db.executeRaw('PRAGMA foreign_keys')
    expect(result.rawRows[0]?.[0]).toBe(1)
  })

  it('returns a usable connection after being reopened following a close', async () => {
    const first = getDatabase()
    closeDatabase()
    const second = getDatabase()
    expect(second).not.toBe(first)
    await expect(second.execute('SELECT 1')).resolves.toBeTruthy()
  })
})
