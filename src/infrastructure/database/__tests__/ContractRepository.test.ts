import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { ContractRepository } from '../repositories/ContractRepository'

const USER_ID = 'user-1'
const PROPERTY_ID = 'prop-1'
const APPLICANT_ID = 'app-1'
const DEAL_ID = 'deal-1'

async function seedFixtures(db: DB): Promise<void> {
  await db.execute(
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
    [USER_ID]
  )
  await db.execute(
    `INSERT INTO properties (id, owner_id, title, city, address, status, created_at, updated_at)
     VALUES (?, ?, 'آپارتمان', 'تهران', 'آدرس', 'active', '2026-08-08', '2026-08-08')`,
    [PROPERTY_ID, USER_ID]
  )
  await db.execute(
    `INSERT INTO applicants (id, user_id, full_name, phone_number, city, status, created_at, updated_at)
     VALUES (?, ?, 'علی رضایی', '09121234567', 'تهران', 'active', '2026-08-08', '2026-08-08')`,
    [APPLICANT_ID, USER_ID]
  )
  await db.execute(
    `INSERT INTO deals (id, user_id, property_id, applicant_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'new', '2026-08-08', '2026-08-08')`,
    [DEAL_ID, USER_ID, PROPERTY_ID, APPLICANT_ID]
  )
}

function baseContract(
  id: string,
  overrides: Partial<Parameters<ContractRepository['create']>[0]> = {}
): Parameters<ContractRepository['create']>[0] {
  return {
    id,
    userId: USER_ID,
    propertyId: PROPERTY_ID,
    applicantId: APPLICANT_ID,
    dealId: DEAL_ID,
    type: 'اجاره',
    amount: 500000000,
    startDate: '2026-09-01',
    endDate: '2027-09-01',
    notes: null,
    ...overrides
  }
}

describe('ContractRepository', () => {
  let db: DB
  let repository: ContractRepository

  beforeEach(async () => {
    db = open({ name: `test-contracts-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await seedFixtures(db)
    repository = new ContractRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a contract with status "active"', async () => {
    const created = await repository.create(baseContract('con-1'))
    expect(created.status).toBe('active')
    expect(created.dealId).toBe(DEAL_ID)
    expect(created.createdAt).toBe(created.updatedAt)
  })

  it('creates a contract without a deal link', async () => {
    const created = await repository.create(baseContract('con-1', { dealId: null }))
    expect(created.dealId).toBeNull()
  })

  it('gets a contract by id', async () => {
    await repository.create(baseContract('con-1', { type: 'فروش' }))
    const found = await repository.getById('con-1')
    expect(found?.type).toBe('فروش')
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })

  it('gets all contracts for a user, newest first', async () => {
    await repository.create(baseContract('con-1'))
    await repository.create(baseContract('con-2'))

    const results = await repository.getAll(USER_ID)
    expect(results.map((c) => c.id)).toEqual(['con-2', 'con-1'])
  })

  it('filters by status', async () => {
    const first = await repository.create(baseContract('con-1'))
    await repository.create(baseContract('con-2'))
    await repository.update(first.id, {
      type: first.type,
      status: 'completed',
      amount: first.amount,
      startDate: first.startDate,
      endDate: first.endDate,
      notes: null
    })

    const active = await repository.getByStatus(USER_ID, 'active')
    const completed = await repository.getByStatus(USER_ID, 'completed')
    expect(active.map((c) => c.id)).toEqual(['con-2'])
    expect(completed.map((c) => c.id)).toEqual(['con-1'])
  })

  it('counts only active contracts', async () => {
    const first = await repository.create(baseContract('con-1'))
    await repository.create(baseContract('con-2'))
    expect(await repository.countActive(USER_ID)).toBe(2)

    await repository.update(first.id, {
      type: first.type,
      status: 'cancelled',
      amount: first.amount,
      startDate: first.startDate,
      endDate: first.endDate,
      notes: null
    })
    expect(await repository.countActive(USER_ID)).toBe(1)
  })

  it('updates a contract', async () => {
    await repository.create(baseContract('con-1'))
    const updated = await repository.update('con-1', {
      type: 'فروش',
      status: 'completed',
      amount: 700000000,
      startDate: '2026-10-01',
      endDate: '2027-10-01',
      notes: 'یادداشت'
    })
    expect(updated.type).toBe('فروش')
    expect(updated.status).toBe('completed')
    expect(updated.notes).toBe('یادداشت')
  })

  it('rejects an invalid status via the CHECK constraint', async () => {
    await repository.create(baseContract('con-1'))
    await expect(
      db.execute("UPDATE contracts SET status = 'not_a_real_status' WHERE id = 'con-1'")
    ).rejects.toThrow()
  })

  it('deletes a contract', async () => {
    await repository.create(baseContract('con-1'))
    await repository.delete('con-1')
    expect(await repository.getById('con-1')).toBeNull()
  })

  it('enforces the property foreign key', async () => {
    await expect(
      repository.create(baseContract('con-1', { propertyId: 'nonexistent-property' }))
    ).rejects.toThrow()
  })

  it('enforces the applicant foreign key', async () => {
    await expect(
      repository.create(baseContract('con-1', { applicantId: 'nonexistent-applicant' }))
    ).rejects.toThrow()
  })
})
