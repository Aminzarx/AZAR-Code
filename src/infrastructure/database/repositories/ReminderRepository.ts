import type { DB } from '@op-engineering/op-sqlite'

export type ReminderRecord = {
  id: string
  userId: string
  propertyId: string | null
  applicantId: string | null
  dealId: string | null
  title: string
  description: string | null
  remindAt: string
  isDone: boolean
  createdAt: string
  updatedAt: string
}

export type CreateReminderRecord = {
  id: string
  userId: string
  propertyId: string | null
  applicantId: string | null
  dealId: string | null
  title: string
  description: string | null
  remindAt: string
}

export type UpdateReminderRecord = {
  title: string
  description: string | null
  remindAt: string
  propertyId: string | null
  applicantId: string | null
  dealId: string | null
}

function toReminder(row: Record<string, unknown>): ReminderRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    propertyId: row.property_id as string | null,
    applicantId: row.applicant_id as string | null,
    dealId: row.deal_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    remindAt: row.remind_at as string,
    isDone: Boolean(row.is_done),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class ReminderRepository {
  constructor(private readonly db: DB) {}

  async create(reminder: CreateReminderRecord): Promise<ReminderRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO reminders
        (id, user_id, property_id, applicant_id, deal_id, title, description, remind_at, is_done, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        reminder.id,
        reminder.userId,
        reminder.propertyId,
        reminder.applicantId,
        reminder.dealId,
        reminder.title,
        reminder.description,
        reminder.remindAt,
        now,
        now
      ]
    )
    return {
      ...reminder,
      isDone: false,
      createdAt: now,
      updatedAt: now
    }
  }

  async getById(id: string): Promise<ReminderRecord | null> {
    const result = await this.db.execute('SELECT * FROM reminders WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toReminder(row) : null
  }

  async getAll(userId: string): Promise<ReminderRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC, rowid DESC',
      [userId]
    )
    return result.rows.map(toReminder)
  }

  /** Not-done reminders whose remind_at is now or later, soonest first. */
  async getUpcoming(userId: string, now: string): Promise<ReminderRecord[]> {
    const result = await this.db.execute(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_done = 0 AND remind_at >= ?
       ORDER BY remind_at ASC`,
      [userId, now]
    )
    return result.rows.map(toReminder)
  }

  /** Every not-done reminder regardless of date (includes overdue ones), soonest first. */
  async getIncomplete(userId: string): Promise<ReminderRecord[]> {
    const result = await this.db.execute(
      `SELECT * FROM reminders WHERE user_id = ? AND is_done = 0 ORDER BY remind_at ASC`,
      [userId]
    )
    return result.rows.map(toReminder)
  }

  async update(id: string, reminder: UpdateReminderRecord): Promise<ReminderRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE reminders
       SET title = ?, description = ?, remind_at = ?, property_id = ?, applicant_id = ?, deal_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        reminder.title,
        reminder.description,
        reminder.remindAt,
        reminder.propertyId,
        reminder.applicantId,
        reminder.dealId,
        now,
        id
      ]
    )
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Reminder ${id} not found after update`)
    }
    return updated
  }

  async setDone(id: string, isDone: boolean): Promise<ReminderRecord> {
    const now = new Date().toISOString()
    await this.db.execute('UPDATE reminders SET is_done = ?, updated_at = ? WHERE id = ?', [
      isDone ? 1 : 0,
      now,
      id
    ])
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Reminder ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM reminders WHERE id = ?', [id])
  }
}
