import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { ApplicantRepository } from '../repositories/ApplicantRepository'

const USER_ID = 'user-1'

async function seedUser(db: DB): Promise<void> {
  await db.execute(
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
    [USER_ID]
  )
}

describe('ApplicantRepository', () => {
  let db: DB
  let repository: ApplicantRepository

  beforeEach(async () => {
    db = open({ name: `test-applicants-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await seedUser(db)
    repository = new ApplicantRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates an applicant with defaulted status and timestamps', async () => {
    const created = await repository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: 'individual',
      preferredTransactionType: 'sale',
      preferredPropertyType: 'apartment',
      city: 'تهران',
      minBudget: 2000000000,
      maxBudget: 5000000000,
      minArea: 80,
      maxArea: 150,
      rooms: 2,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })

    expect(created.id).toBe('app-1')
    expect(created.status).toBe('active')
    expect(created.createdAt).toBeTruthy()
    expect(created.updatedAt).toBe(created.createdAt)
  })

  it('gets an applicant by id', async () => {
    await repository.create(baseApplicant('app-1', { fullName: 'علی رضایی' }))
    const found = await repository.getById('app-1')
    expect(found?.fullName).toBe('علی رضایی')
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })

  it('gets all applicants for a user, newest first', async () => {
    await repository.create(baseApplicant('app-1', { fullName: 'متقاضی اول' }))
    await repository.create(baseApplicant('app-2', { fullName: 'متقاضی دوم' }))

    const results = await repository.getAll(USER_ID)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['app-2', 'app-1'])
  })

  it('searches by name, city, and phone number', async () => {
    await repository.create(baseApplicant('app-1', { fullName: 'علی رضایی', city: 'تهران' }))
    await repository.create(baseApplicant('app-2', { fullName: 'سارا احمدی', city: 'شیراز' }))

    const results = await repository.search(USER_ID, 'شیراز')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('app-2')
  })

  it('counts applicants for a user', async () => {
    expect(await repository.countByUser(USER_ID)).toBe(0)
    await repository.create(baseApplicant('app-1'))
    expect(await repository.countByUser(USER_ID)).toBe(1)
  })

  it('updates an applicant', async () => {
    await repository.create(baseApplicant('app-1', { fullName: 'نام اولیه' }))

    const updated = await repository.update('app-1', {
      fullName: 'نام جدید',
      phoneNumber: '09129999999',
      email: 'test@example.com',
      applicantType: 'company',
      preferredTransactionType: 'rent',
      preferredPropertyType: 'villa',
      city: 'اصفهان',
      minBudget: 1000000,
      maxBudget: 2000000,
      minArea: 50,
      maxArea: 100,
      rooms: 3,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: 'توضیحات',
      status: 'archived'
    })

    expect(updated.fullName).toBe('نام جدید')
    expect(updated.status).toBe('archived')
    expect(updated.email).toBe('test@example.com')
  })

  it('deletes an applicant', async () => {
    await repository.create(baseApplicant('app-1'))
    await repository.delete('app-1')
    expect(await repository.getById('app-1')).toBeNull()
  })

  it('enforces the user foreign key', async () => {
    await expect(
      repository.create(baseApplicant('app-1', { userId: 'nonexistent-user' }))
    ).rejects.toThrow()
  })
})

function baseApplicant(
  id: string,
  overrides: Partial<Parameters<ApplicantRepository['create']>[0]> = {}
): Parameters<ApplicantRepository['create']>[0] {
  return {
    id,
    userId: USER_ID,
    fullName: 'متقاضی نمونه',
    phoneNumber: '09120000001',
    email: null,
    applicantType: null,
    preferredTransactionType: null,
    preferredPropertyType: null,
    city: 'تهران',
    minBudget: null,
    maxBudget: null,
    minArea: null,
    maxArea: null,
    rooms: null,
    depositAmount: null,
    rentAmount: null,
    isConvertible: false,
    description: null,
    ...overrides
  }
}
