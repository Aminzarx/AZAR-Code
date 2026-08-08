export type { ReminderRecord as Reminder } from '@infrastructure/database/repositories/ReminderRepository'

export type ReminderFormValues = {
  title: string
  description: string
  date: string
  time: string
}

export type ReminderFormErrors = Partial<Record<keyof ReminderFormValues, string>>
