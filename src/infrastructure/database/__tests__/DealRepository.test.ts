import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { DealRepository } from '../repositories/DealRepository'

const USER_ID = 'user-1'
const PROPERTY_ID = 'prop-1'
const APPLICANT_ID = 'app-1'

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
}

describe('DealRepository', () => {
  let db: DB
  let repository: DealRepository

  beforeEach(async () => {
    db = open({ name: `test-deals-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await seedFixtures(db)
    repository = new DealRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a deal with status "new" and no notes', async () => {
    const created = await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })

    expect(created.status).toBe('new')
    expect(created.currentStage).toBe('new')
    expect(created.notes).toBeNull()
    expect(created.createdAt).toBe(created.updatedAt)
  })

  it('transitions a deal to a new stage and records stage history', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const updated = await repository.transitionStage('deal-1', 'contacted', USER_ID)
    expect(updated.currentStage).toBe('contacted')

    const history = await repository.getStageHistory('deal-1')
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      fromStage: 'new',
      toStage: 'contacted',
      actorUserId: USER_ID
    })
  })

  it('persists the lost reason only when transitioning to "lost"', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const lost = await repository.transitionStage('deal-1', 'lost', USER_ID, {
      lostReasonId: 'lost-reason-price-too-high'
    })
    expect(lost.lostReasonId).toBe('lost-reason-price-too-high')

    const backToNew = await repository.transitionStage('deal-1', 'new', USER_ID)
    expect(backToNew.lostReasonId).toBeNull()
  })

  it('counts deals by stage', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await repository.create({
      id: 'deal-2',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await repository.transitionStage('deal-2', 'won', USER_ID)

    const counts = await repository.countByStage(USER_ID)
    expect(counts.new).toBe(1)
    expect(counts.won).toBe(1)
    expect(counts.lost).toBe(0)
  })

  it('gets a deal by id', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const found = await repository.getById('deal-1')
    expect(found?.propertyId).toBe(PROPERTY_ID)
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })

  it('gets all deals for a user, newest first', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await repository.create({
      id: 'deal-2',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })

    const results = await repository.getAll(USER_ID)
    expect(results.map((d) => d.id)).toEqual(['deal-2', 'deal-1'])
  })

  it('gets deals by property and by applicant', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })

    expect(await repository.getByProperty(PROPERTY_ID)).toHaveLength(1)
    expect(await repository.getByApplicant(APPLICANT_ID)).toHaveLength(1)
    expect(await repository.getByProperty('other-property')).toHaveLength(0)
  })

  it('counts only active-status deals', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const completed = await repository.create({
      id: 'deal-2',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await repository.updateStatus(completed.id, 'completed')

    expect(await repository.countActive(USER_ID)).toBe(1)
  })

  it('updates status', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const updated = await repository.updateStatus('deal-1', 'contacted')
    expect(updated.status).toBe('contacted')
  })

  it('rejects an invalid status via the CHECK constraint', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await expect(
      db.execute("UPDATE deals SET status = 'not_a_real_status' WHERE id = 'deal-1'")
    ).rejects.toThrow()
  })

  it('updates notes', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    const updated = await repository.updateNotes('deal-1', 'یادداشت تست')
    expect(updated.notes).toBe('یادداشت تست')
  })

  it('deletes a deal', async () => {
    await repository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: PROPERTY_ID,
      applicantId: APPLICANT_ID
    })
    await repository.delete('deal-1')
    expect(await repository.getById('deal-1')).toBeNull()
  })

  it('enforces the property foreign key', async () => {
    await expect(
      repository.create({
        id: 'deal-1',
        userId: USER_ID,
        propertyId: 'nonexistent-property',
        applicantId: APPLICANT_ID
      })
    ).rejects.toThrow()
  })

  it('enforces the applicant foreign key', async () => {
    await expect(
      repository.create({
        id: 'deal-1',
        userId: USER_ID,
        propertyId: PROPERTY_ID,
        applicantId: 'nonexistent-applicant'
      })
    ).rejects.toThrow()
  })
})
