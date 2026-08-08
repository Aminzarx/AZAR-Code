import type { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import type { Reminder, ReminderFormValues } from '../types'
import { validateReminderForm } from '../validation/reminderValidation'
import { ReminderValidationError } from '../validation/ReminderValidationError'

export type ReminderLinks = {
  propertyId?: string | null
  applicantId?: string | null
  dealId?: string | null
}

/** Thin business-rule wrapper around ReminderRepository — the UI never calls the repository directly. */
export class ReminderService {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly generateId: () => string
  ) {}

  async createReminder(
    userId: string,
    values: ReminderFormValues,
    links: ReminderLinks = {}
  ): Promise<Reminder> {
    const { input, errors } = validateReminderForm(values)
    if (!input) {
      throw new ReminderValidationError(errors)
    }
    return this.repository.create({
      id: this.generateId(),
      userId,
      propertyId: links.propertyId ?? null,
      applicantId: links.applicantId ?? null,
      dealId: links.dealId ?? null,
      ...input
    })
  }

  async updateReminder(
    id: string,
    values: ReminderFormValues,
    links: ReminderLinks
  ): Promise<Reminder> {
    const { input, errors } = validateReminderForm(values)
    if (!input) {
      throw new ReminderValidationError(errors)
    }
    return this.repository.update(id, {
      ...input,
      propertyId: links.propertyId ?? null,
      applicantId: links.applicantId ?? null,
      dealId: links.dealId ?? null
    })
  }

  async listReminders(userId: string): Promise<Reminder[]> {
    return this.repository.getAll(userId)
  }

  async listUpcoming(userId: string): Promise<Reminder[]> {
    return this.repository.getUpcoming(userId, new Date().toISOString())
  }

  async listIncomplete(userId: string): Promise<Reminder[]> {
    return this.repository.getIncomplete(userId)
  }

  async getReminder(id: string): Promise<Reminder | null> {
    return this.repository.getById(id)
  }

  async setDone(id: string, isDone: boolean): Promise<Reminder> {
    return this.repository.setDone(id, isDone)
  }

  async deleteReminder(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
