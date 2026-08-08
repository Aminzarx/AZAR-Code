import type { ReminderFormErrors, ReminderFormValues } from '../types'

export type ValidatedReminderInput = {
  title: string
  description: string | null
  remindAt: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateReminderForm(
  values: ReminderFormValues
): { input: ValidatedReminderInput; errors: null } | { input: null; errors: ReminderFormErrors } {
  const errors: ReminderFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = 'عنوان الزامی است.'
  }

  const date = values.date.trim()
  if (!DATE_PATTERN.test(date)) {
    errors.date = 'تاریخ را به‌صورت ۱۴۰۴-۰۵-۲۰ (سال-ماه-روز) وارد کنید.'
  }

  const time = values.time.trim()
  if (!TIME_PATTERN.test(time)) {
    errors.time = 'زمان را به‌صورت ۱۴:۳۰ (ساعت:دقیقه) وارد کنید.'
  }

  let remindAt: string | null = null
  if (!errors.date && !errors.time) {
    const [year, month, day] = date.split('-').map(Number)
    const candidate = new Date(`${date}T${time}:00`)
    const isRealCalendarDate =
      !Number.isNaN(candidate.getTime()) &&
      candidate.getFullYear() === year &&
      candidate.getMonth() + 1 === month &&
      candidate.getDate() === day

    if (!isRealCalendarDate) {
      errors.date = 'تاریخ یا زمان معتبر نیست.'
    } else {
      remindAt = candidate.toISOString()
    }
  }

  if (Object.keys(errors).length > 0 || remindAt === null) {
    return { input: null, errors }
  }

  return {
    input: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      remindAt
    },
    errors: null
  }
}

export function toFormDateTime(remindAt: string): { date: string; time: string } {
  const parsed = new Date(remindAt)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  }
}
