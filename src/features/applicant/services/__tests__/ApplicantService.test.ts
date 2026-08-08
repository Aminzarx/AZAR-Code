import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { ApplicantService } from '../ApplicantService'
import { ApplicantValidationError } from '../../validation/ApplicantValidationError'
import type { ApplicantFormValues } from '../../types'

const USER_ID = 'user-1'

const VALID_VALUES: ApplicantFormValues = {
  fullName: 'علی رضایی',
  phoneNumber: '09121234567',
  email: '',
  applicantType: 'حقیقی',
  preferredTransactionType: 'فروش',
  preferredPropertyType: 'آپارتمان',
  city: 'تهران',
  minBudget: '2000000000',
  maxBudget: '5000000000',
  minArea: '80',
  maxArea: '150',
  rooms: '2',
  description: ''
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `app-${idCounter}`
}

describe('ApplicantService', () => {
  let db: DB
  let service: ApplicantService

  beforeEach(async () => {
    db = open({ name: `test-applicant-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    idCounter = 0
    service = new ApplicantService(new ApplicantRepository(db), generateId)
  })

  afterEach(() => {
    db.close()
  })

  it('creates an applicant from valid form values', async () => {
    const applicant = await service.createApplicant(USER_ID, VALID_VALUES)
    expect(applicant.fullName).toBe('علی رضایی')
    expect(applicant.minBudget).toBe(2000000000)
    expect(applicant.status).toBe('active')
  })

  it('throws ApplicantValidationError for invalid form values, without touching the database', async () => {
    await expect(
      service.createApplicant(USER_ID, { ...VALID_VALUES, fullName: '' })
    ).rejects.toThrow(ApplicantValidationError)
    expect(await service.countApplicants(USER_ID)).toBe(0)
  })

  it('lists and searches applicants for a user', async () => {
    await service.createApplicant(USER_ID, VALID_VALUES)
    await service.createApplicant(USER_ID, {
      ...VALID_VALUES,
      fullName: 'سارا احمدی',
      city: 'شیراز'
    })

    expect(await service.listApplicants(USER_ID)).toHaveLength(2)
    expect(await service.listApplicants(USER_ID, 'شیراز')).toHaveLength(1)
  })

  it('updates an applicant', async () => {
    const created = await service.createApplicant(USER_ID, VALID_VALUES)
    const updated = await service.updateApplicant(
      created.id,
      { ...VALID_VALUES, fullName: 'نام جدید' },
      'archived'
    )
    expect(updated.fullName).toBe('نام جدید')
    expect(updated.status).toBe('archived')
  })

  it('deletes an applicant', async () => {
    const created = await service.createApplicant(USER_ID, VALID_VALUES)
    await service.deleteApplicant(created.id)
    expect(await service.getApplicant(created.id)).toBeNull()
  })
})
