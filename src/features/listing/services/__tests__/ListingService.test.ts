import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ListingRepository } from '@infrastructure/database/repositories/ListingRepository'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ListingService } from '../ListingService'
import { ListingValidationError } from '../../validation/ListingValidationError'
import type { ListingFormValues } from '../../types'

const USER_ID = 'user-1'
const PROPERTY_ID = 'prop-1'

const SALE_VALUES: ListingFormValues = {
  transactionType: 'sale',
  totalPrice: '15000000000',
  deposit: '',
  monthlyRent: ''
}

const RENT_VALUES: ListingFormValues = {
  transactionType: 'rent',
  totalPrice: '',
  deposit: '500000000',
  monthlyRent: '30000000'
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `listing-${idCounter}`
}

describe('ListingService', () => {
  let db: DB
  let service: ListingService
  let propertyRepository: PropertyRepository

  beforeEach(async () => {
    db = open({ name: `test-listing-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    propertyRepository = new PropertyRepository(db)
    await propertyRepository.create({
      id: PROPERTY_ID,
      ownerId: USER_ID,
      title: 'آپارتمان تست',
      propertyType: 'آپارتمان',
      transactionType: null,
      city: 'تهران',
      address: 'خیابان تست',
      price: null,
      area: 100,
      rooms: 2,
      description: null
    })
    idCounter = 0
    service = new ListingService(new ListingRepository(db), propertyRepository, generateId)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a sale listing with a total price, starting in draft', async () => {
    const listing = await service.createListing(PROPERTY_ID, USER_ID, SALE_VALUES)
    expect(listing.transactionType).toBe('sale')
    expect(listing.totalPrice).toBe(15000000000)
    expect(listing.status).toBe('draft')
  })

  it('creates a rent listing with deposit + monthly rent', async () => {
    const listing = await service.createListing(PROPERTY_ID, USER_ID, RENT_VALUES)
    expect(listing.deposit).toBe(500000000)
    expect(listing.monthlyRent).toBe(30000000)
    expect(listing.totalPrice).toBeNull()
  })

  it('rejects a sale listing with no total price', async () => {
    await expect(
      service.createListing(PROPERTY_ID, USER_ID, { ...SALE_VALUES, totalPrice: '' })
    ).rejects.toThrow(ListingValidationError)
  })

  it('rejects a rent listing with neither deposit nor monthly rent', async () => {
    await expect(
      service.createListing(PROPERTY_ID, USER_ID, { ...RENT_VALUES, deposit: '', monthlyRent: '' })
    ).rejects.toThrow(ListingValidationError)
  })

  it('lists listings for a property', async () => {
    await service.createListing(PROPERTY_ID, USER_ID, SALE_VALUES)
    await service.createListing(PROPERTY_ID, USER_ID, RENT_VALUES)
    expect(await service.listByProperty(PROPERTY_ID)).toHaveLength(2)
  })

  it('activates a draft listing on an active property', async () => {
    const listing = await service.createListing(PROPERTY_ID, USER_ID, SALE_VALUES)
    const activated = await service.setStatus(listing.id, 'active')
    expect(activated.status).toBe('active')
  })

  it('BR-008: refuses to activate a listing whose property is archived', async () => {
    const listing = await service.createListing(PROPERTY_ID, USER_ID, SALE_VALUES)
    await propertyRepository.update(PROPERTY_ID, {
      title: 'آپارتمان تست',
      propertyType: 'آپارتمان',
      transactionType: null,
      city: 'تهران',
      address: 'خیابان تست',
      price: null,
      area: 100,
      rooms: 2,
      description: null,
      status: 'archived'
    })
    await expect(service.setStatus(listing.id, 'active')).rejects.toThrow()
  })
})
