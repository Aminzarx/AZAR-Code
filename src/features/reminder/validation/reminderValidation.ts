import {
  formatJalaliDate,
  gregorianIsoToJalali,
  jalaliToGregorianIso,
  parseJalaliDate
} from '@shared/utils/jalaliDate'
import type { ReminderFormErrors, ReminderFormValues } from '../types'

export type ValidatedReminderInput = {
  title: string
  description: string | null
  remindAt: string
  reminderType: ReminderFormValues['reminderType']
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateReminderForm(
  values: ReminderFormValues
): { input: ValidatedReminderInput; errors: null } | { input: null; errors: ReminderFormErrors } {
  const errors: ReminderFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = 'عنوان الزامی است.'
  }

  const parsedDate = parseJalaliDate(values.date)
  if (!parsedDate) {
    errors.date = 'تاریخ را به‌صورت ۱۴۰۵/۰۵/۱۲ (سال/ماه/روز شمسی) وارد کنید.'
  }

  const time = values.time.trim()
  if (!TIME_PATTERN.test(time)) {
    errors.time = 'زمان را به‌صورت ۱۴:۳۰ (ساعت:دقیقه) وارد کنید.'
  }

  let remindAt: string | null = null
  if (parsedDate && !errors.time) {
    const isoDate = jalaliToGregorianIso(parsedDate)
    const candidate = new Date(`${isoDate}T${time}:00`)
    if (Number.isNaN(candidate.getTime())) {
      errors.time = 'تاریخ یا زمان معتبر نیست.'
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
      remindAt,
      reminderType: values.reminderType
    },
    errors: null
  }
}

/** ISO timestamp (as stored) -> the form's Jalali date string + a `HH:mm` time string. */
export function toFormDateTime(remindAt: string): { date: string; time: string } {
  const parsed = new Date(remindAt)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const isoDate = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
  const jalali = gregorianIsoToJalali(isoDate)
  return {
    date: jalali ? formatJalaliDate(jalali) : isoDate,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  }
}
