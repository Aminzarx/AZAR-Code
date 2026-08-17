import { isSameCalendarDay } from '@shared/utils/formatDate'
import type { Reminder } from '../types'

export type ReminderTimeGroupKey = 'today' | 'tomorrow' | 'later'

export type ReminderTimeGroup = {
  key: ReminderTimeGroupKey
  label: string
  reminders: Reminder[]
}

const GROUP_LABELS: Record<ReminderTimeGroupKey, string> = {
  today: 'امروز',
  tomorrow: 'فردا',
  later: 'بعداً'
}

/**
 * design-system.md §17.3 — Reminder List is time-grouped into امروز/فردا/
 * بعداً, a plain date comparison, not a new scheduling concept. Overdue
 * reminders (date before today) are folded into "امروز" — they're the most
 * urgent items and stay visible at the top of the list; the separate
 * `countAttention` below is what tells the broker they're actually overdue.
 * `reminders` is expected pre-sorted by `remindAt` ascending (as the
 * repository already returns it), so each group stays chronological.
 */
export function groupRemindersByTime(
  reminders: Reminder[],
  now: Date = new Date()
): ReminderTimeGroup[] {
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const startOfDayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

  const buckets: Record<ReminderTimeGroupKey, Reminder[]> = {
    today: [],
    tomorrow: [],
    later: []
  }

  for (const reminder of reminders) {
    const remindAt = new Date(reminder.remindAt)
    if (remindAt < startOfTomorrow) {
      buckets.today.push(reminder)
    } else if (remindAt < startOfDayAfterTomorrow) {
      buckets.tomorrow.push(reminder)
    } else {
      buckets.later.push(reminder)
    }
  }

  return (Object.keys(buckets) as ReminderTimeGroupKey[])
    .map((key) => ({ key, label: GROUP_LABELS[key], reminders: buckets[key] }))
    .filter((group) => group.reminders.length > 0)
}

export type ReminderAttentionCounts = {
  overdueCount: number
  dueTodayCount: number
}

/**
 * §17.3's compact attention header — overdue (not-done, remind time already
 * passed) and due-today (not-done, still later today) are kept disjoint so
 * the two counts never double-count the same reminder.
 */
export function countReminderAttention(
  reminders: Reminder[],
  now: Date = new Date()
): ReminderAttentionCounts {
  let overdueCount = 0
  let dueTodayCount = 0

  for (const reminder of reminders) {
    if (reminder.isDone) {
      continue
    }
    const remindAt = new Date(reminder.remindAt)
    if (remindAt < now) {
      overdueCount += 1
    } else if (isSameCalendarDay(reminder.remindAt, now)) {
      dueTodayCount += 1
    }
  }

  return { overdueCount, dueTodayCount }
}
