import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { ReminderService } from '../ReminderService'
import { ReminderValidationError } from '../../validation/ReminderValidationError'
import type { ReminderFormValues } from '../../types'

const USER_ID = 'user-1'

const VALID_VALUES: ReminderFormValues = {
  title: 'تماس با متقاضی',
  description: '',
  date: '1405/06/10',
  time: '14:30'
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
})
