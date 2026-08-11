import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { ContractService } from '../ContractService'
import { ContractValidationError } from '../../validation/ContractValidationError'
import type { ContractFormValues } from '../../types'

const USER_ID = 'user-1'

const VALID_VALUES: ContractFormValues = {
  type: 'اجاره',
  amount: '500000000',
  startDate: '2026-09-01',
  endDate: '2027-09-01',
  notes: ''
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `id-${idCounter}`
}

describe('ContractService', () => {
  let db: DB
  let service: ContractService
  let propertyId: string
  let applicantId: string

  beforeEach(async () => {
    db = open({ name: `test-contract-service-${Math.random()}.db`, location: ':memory:' })
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
    service = new ContractService(
      new ContractRepository(db),
      propertyService,
      applicantService,
      generateId
    )

    const property = await propertyService.createProperty(USER_ID, {
      title: 'آپارتمان دو خوابه',
      propertyType: '',
      transactionType: '',
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: '',
      area: '',
      rooms: '',
      depositAmount: '',
      rentAmount: '',
      isConvertible: false,
      description: ''
    })
    propertyId = property.id

    const applicant = await applicantService.createApplicant(USER_ID, {
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      preferredTransactionType: '',
      preferredPropertyType: '',
      city: 'تهران',
      minBudget: '',
      maxBudget: '',
      minArea: '',
      maxArea: '',
      rooms: '',
      depositAmount: '',
      rentAmount: '',
      isConvertible: false,
      description: ''
    })
    applicantId = applicant.id
  })

  afterEach(() => {
    db.close()
  })

  it('creates a contract with status "active"', async () => {
    const contract = await service.createContract(
      USER_ID,
      { propertyId, applicantId },
      VALID_VALUES
    )
    expect(contract.status).toBe('active')
    expect(contract.propertyId).toBe(propertyId)
  })

  it('throws ContractValidationError for invalid form values', async () => {
    await expect(
      service.createContract(
        USER_ID,
        { propertyId, applicantId },
        {
          ...VALID_VALUES,
          startDate: 'not-a-date'
        }
      )
    ).rejects.toThrow(ContractValidationError)
  })

  it('lists contracts enriched with property and applicant details', async () => {
    await service.createContract(USER_ID, { propertyId, applicantId }, VALID_VALUES)
    const contracts = await service.listContracts(USER_ID)

    expect(contracts).toHaveLength(1)
    expect(contracts[0]?.property?.title).toBe('آپارتمان دو خوابه')
    expect(contracts[0]?.applicant?.fullName).toBe('علی رضایی')
  })

  it('gets a single contract enriched with details', async () => {
    const created = await service.createContract(USER_ID, { propertyId, applicantId }, VALID_VALUES)
    const found = await service.getContract(created.id)
    expect(found?.property?.id).toBe(propertyId)
    expect(found?.applicant?.id).toBe(applicantId)
  })

  it('updates a contract', async () => {
    const created = await service.createContract(USER_ID, { propertyId, applicantId }, VALID_VALUES)
    const updated = await service.updateContract(
      created.id,
      { ...VALID_VALUES, type: 'فروش' },
      'completed'
    )
    expect(updated.type).toBe('فروش')
    expect(updated.status).toBe('completed')
  })

  it('counts only active contracts', async () => {
    const created = await service.createContract(USER_ID, { propertyId, applicantId }, VALID_VALUES)
    expect(await service.countActiveContracts(USER_ID)).toBe(1)
    await service.updateContract(created.id, VALID_VALUES, 'cancelled')
    expect(await service.countActiveContracts(USER_ID)).toBe(0)
  })

  it('deletes a contract', async () => {
    const created = await service.createContract(USER_ID, { propertyId, applicantId }, VALID_VALUES)
    await service.deleteContract(created.id)
    expect(await service.getContract(created.id)).toBeNull()
  })
})
