import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { PropertyRepository } from '../repositories/PropertyRepository'

const OWNER_ID = 'user-1'

async function seedUser(db: DB): Promise<void> {
  await db.execute(
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
    [OWNER_ID]
  )
}

describe('PropertyRepository', () => {
  let db: DB
  let repository: PropertyRepository

  beforeEach(async () => {
    db = open({ name: `test-properties-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await seedUser(db)
    repository = new PropertyRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a property with defaulted status and timestamps', async () => {
    const created = await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'آپارتمان دو خوابه',
      propertyType: 'apartment',
      transactionType: 'sale',
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: 5000000000,
      area: 120,
      rooms: 2,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    expect(created.id).toBe('prop-1')
    expect(created.status).toBe('active')
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBe(created.createdAt)
  })

  it('finds a property by id', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'آپارتمان دو خوابه',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const found = await repository.findById('prop-1')
    expect(found?.title).toBe('آپارتمان دو خوابه')
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.findById('missing')).toBeNull()
  })

  it('lists properties for an owner, newest first', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'ملک اول',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    await repository.create({
      id: 'prop-2',
      ownerId: OWNER_ID,
      title: 'ملک دوم',
      propertyType: null,
      transactionType: null,
      city: 'شیراز',
      address: 'آدرس ۲',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const results = await repository.findAllByOwner(OWNER_ID)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['prop-2', 'prop-1'])
  })

  it('filters by search text against title, city, and address', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'آپارتمان لوکس',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    await repository.create({
      id: 'prop-2',
      ownerId: OWNER_ID,
      title: 'ویلای شمال',
      propertyType: null,
      transactionType: null,
      city: 'شیراز',
      address: 'آدرس ۲',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const results = await repository.findAllByOwner(OWNER_ID, 'شیراز')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('prop-2')
  })

  it('filters by search text against price', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'آپارتمان لوکس',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: 500000000,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    await repository.create({
      id: 'prop-2',
      ownerId: OWNER_ID,
      title: 'ویلای شمال',
      propertyType: null,
      transactionType: null,
      city: 'شیراز',
      address: 'آدرس ۲',
      price: 900000000,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const results = await repository.findAllByOwner(OWNER_ID, '500000000')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('prop-1')
  })

  it('filters by search text against barter items and their free-text description', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'آپارتمان تهاتری',
      propertyType: null,
      transactionType: 'تهاتر',
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: ['طلا', 'سایر'],
      barterOtherDescription: 'لوازم منزل',
      description: null
    })
    await repository.create({
      id: 'prop-2',
      ownerId: OWNER_ID,
      title: 'ویلای شمال',
      propertyType: null,
      transactionType: null,
      city: 'شیراز',
      address: 'آدرس ۲',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const byItem = await repository.findAllByOwner(OWNER_ID, 'طلا')
    expect(byItem).toHaveLength(1)
    expect(byItem[0]?.id).toBe('prop-1')

    const byDescription = await repository.findAllByOwner(OWNER_ID, 'لوازم منزل')
    expect(byDescription).toHaveLength(1)
    expect(byDescription[0]?.id).toBe('prop-1')
  })

  it('counts properties for an owner', async () => {
    expect(await repository.countByOwner(OWNER_ID)).toBe(0)
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'ملک اول',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    expect(await repository.countByOwner(OWNER_ID)).toBe(1)
  })

  it('updates a property', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'عنوان اولیه',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const updated = await repository.update('prop-1', {
      title: 'عنوان جدید',
      propertyType: 'apartment',
      transactionType: 'rent',
      city: 'تهران',
      address: 'آدرس جدید',
      price: 1000000,
      area: 80,
      rooms: 1,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: 'توضیحات',
      status: 'archived'
    })

    expect(updated.title).toBe('عنوان جدید')
    expect(updated.status).toBe('archived')
    expect(updated.description).toBe('توضیحات')
  })

  it('deletes a property', async () => {
    await repository.create({
      id: 'prop-1',
      ownerId: OWNER_ID,
      title: 'ملک اول',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس ۱',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    await repository.delete('prop-1')
    expect(await repository.findById('prop-1')).toBeNull()
  })

  it('enforces the owner foreign key', async () => {
    await expect(
      repository.create({
        id: 'prop-1',
        ownerId: 'nonexistent-user',
        title: 'ملک اول',
        propertyType: null,
        transactionType: null,
        city: 'تهران',
        address: 'آدرس ۱',
        price: null,
        area: null,
        rooms: null,
        depositAmount: null,
        rentAmount: null,
        isConvertible: false,
        barterItems: [],
        barterOtherDescription: null,
        description: null
      })
    ).rejects.toThrow()
  })
})
