import type { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import type { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import type { Reminder, ReminderFormValues } from '../types'
import { validateReminderForm } from '../validation/reminderValidation'
import { ReminderValidationError } from '../validation/ReminderValidationError'

export type ReminderLinks = {
  propertyId?: string | null
  applicantId?: string | null
  dealId?: string | null
}

// A deal only gets auto-advanced to "visited" out of these stages —
// anything already past visited (negotiation onward) or terminal (lost)
// is left alone, since completing a visit reminder shouldn't ever move
// a deal backward or resurrect a closed one.
const STAGES_ADVANCEABLE_TO_VISITED = ['new', 'contacted', 'interested', 'visit_scheduled']

/**
 * Thin business-rule wrapper around ReminderRepository — the UI never
 * calls the repository directly. `dealRepository` is optional so
 * existing call sites that never touch deal-linked reminders (or tests
 * that don't need this behavior) don't have to wire it up — when it's
 * omitted, `setDone` simply skips the pipeline-advancement step.
 */
export class ReminderService {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly generateId: () => string,
    private readonly dealRepository?: DealRepository
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

  /**
   * `actorUserId` is only needed to record who triggered the resulting
   * pipeline-stage transition (deal_stage_history.actor_user_id) — it's
   * optional because plenty of callers mark non-deal-linked reminders
   * done and have no transition to record.
   */
  async setDone(id: string, isDone: boolean, actorUserId?: string): Promise<Reminder> {
    const updated = await this.repository.setDone(id, isDone)

    if (
      isDone &&
      updated.reminderType === 'visit' &&
      updated.dealId &&
      actorUserId &&
      this.dealRepository
    ) {
      const deal = await this.dealRepository.getById(updated.dealId)
      if (deal && STAGES_ADVANCEABLE_TO_VISITED.includes(deal.currentStage)) {
        await this.dealRepository.transitionStage(updated.dealId, 'visited', actorUserId, {
          note: 'بازدید تکمیل شد (خودکار)'
        })
      }
    }

    return updated
  }

  async deleteReminder(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
