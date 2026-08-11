import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { ReminderService } from '../ReminderService'
import { ReminderValidationError } from '../../validation/ReminderValidationError'
import type { ReminderFormValues } from '../../types'

const USER_ID = 'user-1'

const VALID_VALUES: ReminderFormValues = {
  title: 'تماس با متقاضی',
  description: '',
  date: '1405/06/10',
  time: '14:30',
  reminderType: 'general'
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `rem-${idCounter}`
}

describe('ReminderService', () => {
  let db: DB
  let service: ReminderService

  beforeEach(async () => {
    db = open({ name: `test-reminder-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    idCounter = 0
    service = new ReminderService(new ReminderRepository(db), generateId)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a reminder from valid form values', async () => {
    const reminder = await service.createReminder(USER_ID, VALID_VALUES)
    expect(reminder.title).toBe('تماس با متقاضی')
    expect(reminder.isDone).toBe(false)
    expect(reminder.propertyId).toBeNull()
  })

  it('creates a reminder with optional links', async () => {
    await db.execute(
      `INSERT INTO properties (id, owner_id, title, city, address, status, created_at, updated_at)
       VALUES ('prop-1', ?, 'آپارتمان', 'تهران', 'آدرس', 'active', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    const reminder = await service.createReminder(USER_ID, VALID_VALUES, { propertyId: 'prop-1' })
    expect(reminder.propertyId).toBe('prop-1')
  })

  it('throws ReminderValidationError for invalid form values', async () => {
    await expect(service.createReminder(USER_ID, { ...VALID_VALUES, title: '' })).rejects.toThrow(
      ReminderValidationError
    )
  })

  it('lists reminders for a user', async () => {
    await service.createReminder(USER_ID, VALID_VALUES)
    expect(await service.listReminders(USER_ID)).toHaveLength(1)
  })

  it('lists only upcoming, not-done reminders', async () => {
    await service.createReminder(USER_ID, { ...VALID_VALUES, date: '1395/01/01' })
    const future = await service.createReminder(USER_ID, { ...VALID_VALUES, date: '1410/01/01' })

    const upcoming = await service.listUpcoming(USER_ID)
    expect(upcoming.map((r) => r.id)).toEqual([future.id])
  })

  it('updates a reminder', async () => {
    const created = await service.createReminder(USER_ID, VALID_VALUES)
    const updated = await service.updateReminder(
      created.id,
      { ...VALID_VALUES, title: 'عنوان جدید' },
      {}
    )
    expect(updated.title).toBe('عنوان جدید')
  })

  it('marks a reminder done', async () => {
    const created = await service.createReminder(USER_ID, VALID_VALUES)
    const done = await service.setDone(created.id, true)
    expect(done.isDone).toBe(true)
  })

  it('deletes a reminder', async () => {
    const created = await service.createReminder(USER_ID, VALID_VALUES)
    await service.deleteReminder(created.id)
    expect(await service.getReminder(created.id)).toBeNull()
  })

  describe('pipeline auto-advancement on completing a visit reminder', () => {
    let dealRepository: DealRepository
    let dealId: string

    beforeEach(async () => {
      dealRepository = new DealRepository(db)
      service = new ReminderService(new ReminderRepository(db), generateId, dealRepository)

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
      const deal = await dealRepository.create({
        id: 'deal-1',
        userId: USER_ID,
        propertyId: 'prop-1',
        applicantId: 'app-1'
      })
      dealId = deal.id
    })

    it('advances the deal to "visited" when a linked visit reminder is completed', async () => {
      await dealRepository.transitionStage(dealId, 'visit_scheduled', USER_ID)
      const reminder = await service.createReminder(
        USER_ID,
        { ...VALID_VALUES, reminderType: 'visit' },
        { dealId }
      )

      await service.setDone(reminder.id, true, USER_ID)

      const deal = await dealRepository.getById(dealId)
      expect(deal?.currentStage).toBe('visited')
    })

    it('does not advance the deal for a non-visit reminder', async () => {
      await dealRepository.transitionStage(dealId, 'visit_scheduled', USER_ID)
      const reminder = await service.createReminder(
        USER_ID,
        { ...VALID_VALUES, reminderType: 'call' },
        { dealId }
      )

      await service.setDone(reminder.id, true, USER_ID)

      const deal = await dealRepository.getById(dealId)
      expect(deal?.currentStage).toBe('visit_scheduled')
    })

    it('does not move a deal backward if it already progressed past "visited"', async () => {
      await dealRepository.transitionStage(dealId, 'negotiation', USER_ID)
      const reminder = await service.createReminder(
        USER_ID,
        { ...VALID_VALUES, reminderType: 'visit' },
        { dealId }
      )

      await service.setDone(reminder.id, true, USER_ID)

      const deal = await dealRepository.getById(dealId)
      expect(deal?.currentStage).toBe('negotiation')
    })

    it('does not advance the deal when uncompleting (unchecking) a visit reminder', async () => {
      await dealRepository.transitionStage(dealId, 'visit_scheduled', USER_ID)
      const reminder = await service.createReminder(
        USER_ID,
        { ...VALID_VALUES, reminderType: 'visit' },
        { dealId }
      )

      await service.setDone(reminder.id, false, USER_ID)

      const deal = await dealRepository.getById(dealId)
      expect(deal?.currentStage).toBe('visit_scheduled')
    })

    it('does not advance a visit reminder with no deal link', async () => {
      const reminder = await service.createReminder(USER_ID, {
        ...VALID_VALUES,
        reminderType: 'visit'
      })
      await expect(service.setDone(reminder.id, true, USER_ID)).resolves.not.toThrow()
    })
  })
})
