import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { PhotoRepository } from '@infrastructure/database/repositories/PhotoRepository'
import { saveSharedFile } from '../services/saveSharedFile'
import { isSharedFileId, type SharedFile } from '../shareFile'

const USER_ID = 'user-1'
let n = 0
const generateId = (): string => `id-${++n}`

describe('saveSharedFile (Amin #6339)', () => {
  let db: DB

  beforeEach(async () => {
    db = open({ name: `test-share-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    n = 0
  })

  afterEach(() => {
    db.close()
  })

  it('saves a new file marked «فایل اشتراکی», the owner as a contact, and its photos', async () => {
    const file: SharedFile = {
      v: 1,
      title: 'آپارتمان ونک',
      city: 'تهران',
      transactionType: 'فروش',
      price: 1000,
      area: 90,
      barterItems: [],
      owner: { name: 'همکار', phone: '+989122222222', isSender: true },
      photos: [{ data: 'UklGRg==', bytes: 6, width: 4, height: 3 }]
    }
    const id = await saveSharedFile(db, USER_ID, file, generateId)
    expect(isSharedFileId(id)).toBe(true)
    const saved = await new PropertyRepository(db).findById(id)
    expect(saved).toMatchObject({ title: 'آپارتمان ونک', city: 'تهران', address: '', price: 1000, area: 90, rooms: null, ownerId: USER_ID })
    expect(saved?.owner).toMatchObject({ fullName: 'همکار', phoneNumber: '+989122222222' })
    const photos = await new PhotoRepository(db, generateId).listFor('property', id)
    expect(photos).toHaveLength(1)
    expect(photos[0]).toMatchObject({ data: 'UklGRg==', bytes: 6, blobHash: null })
  })

  it('without a number there is no owner contact; without photos none are made', async () => {
    const id = await saveSharedFile(db, USER_ID, { title: 'زمین', owner: undefined }, generateId)
    const saved = await new PropertyRepository(db).findById(id)
    expect(saved?.owner).toBeNull()
    expect(await new PhotoRepository(db, generateId).listFor('property', id)).toHaveLength(0)
    const contacts = await db.execute('SELECT COUNT(*) AS c FROM contacts')
    expect(Number(contacts.rows[0]?.c)).toBe(0)
  })

  it('refuses a snapshot with no title', async () => {
    await expect(saveSharedFile(db, USER_ID, { title: '  ' }, generateId)).rejects.toThrow('invalid_shared_file')
  })
})
