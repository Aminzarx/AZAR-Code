import type { ReminderType } from '@infrastructure/database/repositories/ReminderRepository'

export type {
  ReminderRecord as Reminder,
  ReminderType
} from '@infrastructure/database/repositories/ReminderRepository'
export { REMINDER_TYPES } from '@infrastructure/database/repositories/ReminderRepository'

export type ReminderFormValues = {
  title: string
  description: string
  date: string
  time: string
  reminderType: ReminderType
}

export type ReminderFormErrors = Partial<Record<keyof ReminderFormValues, string>>
