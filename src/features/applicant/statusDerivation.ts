import type { DealRecord } from '@infrastructure/database/repositories/DealRepository'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import type { StatusTone } from '@shared/theme/tokens'
import type { Applicant } from './types'

export type DerivedStatus = {
  label: string
  tone: StatusTone
}

/**
 * design-system.md §6.5 — list screens show only this cheap base status
 * (straight from the DB `status` column) to avoid an N+1 deal/reminder
 * query per row; the richer derived status below is Detail-screen-only.
 */
export function baseApplicantStatus(status: Applicant['status']): DerivedStatus {
  return status === 'archived'
    ? { label: 'غیرفعال', tone: 'neutral' }
    : { label: 'فعال', tone: 'positive' }
}

/**
 * design-system.md §6.5 — Applicant Detail's richer derived status:
 * archived → غیرفعال; else an incomplete overdue reminder → نیازمند
 * پیگیری (takes priority over deal state); else a won-stage deal →
 * معامله‌شده; else any open-stage deal → در حال تطبیق; else فعال.
 * Reuses `DealRepository.getByApplicant` and `ReminderRepository`'s
 * existing `isDone`/`remindAt`/`applicantId` fields — no schema change.
 * The caller passes the fetched deals/reminders in.
 */
export function deriveApplicantStatus(
  applicant: Applicant,
  deals: DealRecord[],
  reminders: ReminderRecord[],
  now: Date = new Date()
): DerivedStatus {
  if (applicant.status === 'archived') {
    return { label: 'غیرفعال', tone: 'neutral' }
  }
  const hasOverdueReminder = reminders.some(
    (reminder) => !reminder.isDone && new Date(reminder.remindAt).getTime() <= now.getTime()
  )
  if (hasOverdueReminder) {
    return { label: 'نیازمند پیگیری', tone: 'attention' }
  }
  if (deals.some((deal) => deal.currentStage === 'won')) {
    return { label: 'معامله‌شده', tone: 'highlight' }
  }
  if (deals.some((deal) => deal.currentStage !== 'won' && deal.currentStage !== 'lost')) {
    return { label: 'در حال تطبیق', tone: 'inProgress' }
  }
  return { label: 'فعال', tone: 'positive' }
}
