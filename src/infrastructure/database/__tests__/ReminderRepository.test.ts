import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../migrationRunner'
import { ReminderRepository } from '../repositories/ReminderRepository'

const USER_ID = 'user-1'

async function seedUser(db: DB): Promise<void> {
  await db.execute(
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
    [USER_ID]
  )
}

function baseReminder(
  id: string,
  overrides: Partial<Parameters<ReminderRepository['create']>[0]> = {}
): Parameters<ReminderRepository['create']>[0] {
  return {
    id,
    userId: USER_ID,
    propertyId: null,
    applicantId: null,
    dealId: null,
    title: 'تماس با متقاضی',
    description: null,
    remindAt: '2026-09-01T10:00:00.000Z',
    ...overrides
  }
}

describe('ReminderRepository', () => {
  let db: DB
  let repository: ReminderRepository

  beforeEach(async () => {
    db = open({ name: `test-reminders-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await seedUser(db)
    repository = new ReminderRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a reminder with is_done false', async () => {
    const created = await repository.create(baseReminder('rem-1'))
    expect(created.isDone).toBe(false)
    expect(created.createdAt).toBe(created.updatedAt)
  })

  it('gets a reminder by id', async () => {
    await repository.create(baseReminder('rem-1', { title: 'یادآوری بازدید' }))
    const found = await repository.getById('rem-1')
    expect(found?.title).toBe('یادآوری بازدید')
  })

  it('returns null for a non-existent id', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })

  it('gets all reminders for a user, soonest first', async () => {
    await repository.create(baseReminder('rem-1', { remindAt: '2026-09-05T00:00:00.000Z' }))
    await repository.create(baseReminder('rem-2', { remindAt: '2026-09-01T00:00:00.000Z' }))

    const results = await repository.getAll(USER_ID)
    expect(results.map((r) => r.id)).toEqual(['rem-2', 'rem-1'])
  })

  it('gets only future, not-done reminders via getUpcoming', async () => {
    await repository.create(baseReminder('rem-past', { remindAt: '2020-01-01T00:00:00.000Z' }))
    const future = await repository.create(
      baseReminder('rem-future', { remindAt: '2030-01-01T00:00:00.000Z' })
    )
    const doneFuture = await repository.create(
      baseReminder('rem-done', { remindAt: '2030-06-01T00:00:00.000Z' })
    )
    await repository.setDone(doneFuture.id, true)

    const results = await repository.getUpcoming(USER_ID, '2026-08-08T00:00:00.000Z')
    expect(results.map((r) => r.id)).toEqual([future.id])
  })

  it('gets all not-done reminders (including overdue) via getIncomplete', async () => {
    await repository.create(baseReminder('rem-past', { remindAt: '2020-01-01T00:00:00.000Z' }))
    const done = await repository.create(
      baseReminder('rem-done', { remindAt: '2030-01-01T00:00:00.000Z' })
    )
    await repository.setDone(done.id, true)

    const results = await repository.getIncomplete(USER_ID)
    expect(results.map((r) => r.id)).toEqual(['rem-past'])
  })

  it('updates a reminder', async () => {
    await repository.create(baseReminder('rem-1'))
    const updated = await repository.update('rem-1', {
      title: 'عنوان جدید',
      description: 'توضیحات',
      remindAt: '2026-10-01T00:00:00.000Z',
      propertyId: null,
      applicantId: null,
      dealId: null
    })
    expect(updated.title).toBe('عنوان جدید')
    expect(updated.description).toBe('توضیحات')
  })

  it('marks a reminder done and undone', async () => {
    const created = await repository.create(baseReminder('rem-1'))
    const done = await repository.setDone(created.id, true)
    expect(done.isDone).toBe(true)
    const undone = await repository.setDone(created.id, false)
    expect(undone.isDone).toBe(false)
  })

  it('deletes a reminder', async () => {
    await repository.create(baseReminder('rem-1'))
    await repository.delete('rem-1')
    expect(await repository.getById('rem-1')).toBeNull()
  })

  it('enforces the user foreign key', async () => {
    await expect(
      repository.create(baseReminder('rem-1', { userId: 'nonexistent-user' }))
    ).rejects.toThrow()
  })

  it('allows creating a reminder linked to a property, applicant, and deal', async () => {
    await db.execute(
      `INSERT INTO properties (id, owner_id, title, city, address, status, created_at, updated_at)
       VALUES ('prop-1', ?, 'آپارتمان', 'تهران', 'آدرس', 'active', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    await db.execute(
      `INSERT INTO applicants (id, user_id, full_name, phone_number, city, status, created_at, updated_at)
       VALUES ('app-1', ?, 'علی رضایی', '09121234567', 'تهران', 'active', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    await db.execute(
      `INSERT INTO deals (id, user_id, property_id, applicant_id, status, created_at, updated_at)
       VALUES ('deal-1', ?, 'prop-1', 'app-1', 'new', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )

    const created = await repository.create(
      baseReminder('rem-1', { propertyId: 'prop-1', applicantId: 'app-1', dealId: 'deal-1' })
    )
    expect(created.propertyId).toBe('prop-1')
    expect(created.applicantId).toBe('app-1')
    expect(created.dealId).toBe('deal-1')
  })
})
