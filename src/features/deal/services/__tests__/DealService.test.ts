import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { DealService } from '../DealService'

const USER_ID = 'user-1'

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `id-${idCounter}`
}

describe('DealService', () => {
  let db: DB
  let service: DealService
  let propertyId: string
  let applicantId: string

  beforeEach(async () => {
    db = open({ name: `test-deal-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    idCounter = 0

    const propertyService = new PropertyService(new PropertyRepository(db), generateId)
    const applicantService = new ApplicantService(new ApplicantRepository(db), generateId)
    service = new DealService(new DealRepository(db), propertyService, applicantService, generateId)

    const property = await propertyService.createProperty(USER_ID, {
      title: 'آپارتمان دو خوابه',
      propertyType: '',
      transactionType: '',
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: '',
      area: '',
      rooms: '',
      description: ''
    })
    propertyId = property.id

    const applicant = await applicantService.createApplicant(USER_ID, {
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: '',
      applicantType: '',
      preferredTransactionType: '',
      preferredPropertyType: '',
      city: 'تهران',
      minBudget: '',
      maxBudget: '',
      minArea: '',
      maxArea: '',
      rooms: '',
      description: ''
    })
    applicantId = applicant.id
  })

  afterEach(() => {
    db.close()
  })

  it('creates a deal linking a property and an applicant', async () => {
    const deal = await service.createDeal(USER_ID, propertyId, applicantId)
    expect(deal.status).toBe('new')
    expect(deal.propertyId).toBe(propertyId)
    expect(deal.applicantId).toBe(applicantId)
  })

  it('lists deals enriched with property and applicant details', async () => {
    await service.createDeal(USER_ID, propertyId, applicantId)
    const deals = await service.listDeals(USER_ID)

    expect(deals).toHaveLength(1)
    expect(deals[0]?.property?.title).toBe('آپارتمان دو خوابه')
    expect(deals[0]?.applicant?.fullName).toBe('علی رضایی')
  })

  it('gets a single deal enriched with details', async () => {
    const created = await service.createDeal(USER_ID, propertyId, applicantId)
    const found = await service.getDeal(created.id)
    expect(found?.property?.id).toBe(propertyId)
    expect(found?.applicant?.id).toBe(applicantId)
  })

  it('updates status', async () => {
    const created = await service.createDeal(USER_ID, propertyId, applicantId)
    const updated = await service.updateStatus(created.id, 'contacted')
    expect(updated.status).toBe('contacted')
  })

  it('updates and normalizes notes', async () => {
    const created = await service.createDeal(USER_ID, propertyId, applicantId)
    const updated = await service.updateNotes(created.id, '  یادداشت  ')
    expect(updated.notes).toBe('یادداشت')
  })

  it('counts only active deals', async () => {
    const created = await service.createDeal(USER_ID, propertyId, applicantId)
    expect(await service.countActiveDeals(USER_ID)).toBe(1)
    await service.updateStatus(created.id, 'completed')
    expect(await service.countActiveDeals(USER_ID)).toBe(0)
  })

  it('deletes a deal', async () => {
    const created = await service.createDeal(USER_ID, propertyId, applicantId)
    await service.deleteDeal(created.id)
    expect(await service.getDeal(created.id)).toBeNull()
  })
})
