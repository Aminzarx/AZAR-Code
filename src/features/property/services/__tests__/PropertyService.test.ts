import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { PropertyService } from '../PropertyService'
import { PropertyValidationError } from '../PropertyValidationError'
import type { PropertyFormValues } from '../../types'

const OWNER_ID = 'user-1'

const VALID_VALUES: PropertyFormValues = {
  title: 'آپارتمان دو خوابه',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  address: 'خیابان ولیعصر',
  price: '5000000000',
  area: '120',
  rooms: '2',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  description: ''
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `prop-${idCounter}`
}

describe('PropertyService', () => {
  let db: DB
  let service: PropertyService

  beforeEach(async () => {
    db = open({ name: `test-property-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [OWNER_ID]
    )
    idCounter = 0
    service = new PropertyService(new PropertyRepository(db), generateId)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a property from valid form values', async () => {
    const property = await service.createProperty(OWNER_ID, VALID_VALUES)
    expect(property.title).toBe('آپارتمان دو خوابه')
    expect(property.price).toBe(5000000000)
    expect(property.status).toBe('active')
  })

  it('throws PropertyValidationError for invalid form values, without touching the database', async () => {
    await expect(service.createProperty(OWNER_ID, { ...VALID_VALUES, title: '' })).rejects.toThrow(
      PropertyValidationError
    )
    expect(await service.countProperties(OWNER_ID)).toBe(0)
  })

  it('lists and searches properties for an owner', async () => {
    await service.createProperty(OWNER_ID, VALID_VALUES)
    await service.createProperty(OWNER_ID, { ...VALID_VALUES, title: 'ویلای شمال', city: 'رشت' })

    expect(await service.listProperties(OWNER_ID)).toHaveLength(2)
    expect(await service.listProperties(OWNER_ID, 'رشت')).toHaveLength(1)
  })

  it('updates a property', async () => {
    const created = await service.createProperty(OWNER_ID, VALID_VALUES)
    const updated = await service.updateProperty(
      created.id,
      { ...VALID_VALUES, title: 'عنوان جدید' },
      'archived'
    )
    expect(updated.title).toBe('عنوان جدید')
    expect(updated.status).toBe('archived')
  })

  it('deletes a property', async () => {
    const created = await service.createProperty(OWNER_ID, VALID_VALUES)
    await service.deleteProperty(created.id)
    expect(await service.getProperty(created.id)).toBeNull()
  })
})
