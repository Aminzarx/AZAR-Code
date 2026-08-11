import { jalaliToGregorianIso } from '@shared/utils/jalaliDate'
import { toFormDateTime, validateReminderForm } from '../reminderValidation'
import type { ReminderFormValues } from '../../types'

const VALID_VALUES: ReminderFormValues = {
  title: 'تماس با متقاضی',
  description: 'یادداشت',
  date: '1405/06/10',
  time: '14:30'
}

const EXPECTED_ISO_DATE = jalaliToGregorianIso({ year: 1405, month: 6, day: 10 })

describe('validateReminderForm', () => {
  it('accepts a fully valid form and produces an ISO remindAt converted from the Jalali date', () => {
    const result = validateReminderForm(VALID_VALUES)
    expect(result.errors).toBeNull()
    expect(result.input?.title).toBe('تماس با متقاضی')
    expect(result.input?.description).toBe('یادداشت')
    expect(result.input?.remindAt).toBe(new Date(`${EXPECTED_ISO_DATE}T14:30:00`).toISOString())
  })

  it('accepts single-digit month/day and Persian digits identically', () => {
    const result = validateReminderForm({ ...VALID_VALUES, date: '۱۴۰۵/۶/۱۰' })
    expect(result.errors).toBeNull()
    expect(result.input?.remindAt).toBe(new Date(`${EXPECTED_ISO_DATE}T14:30:00`).toISOString())
  })

  it('requires a title', () => {
    const result = validateReminderForm({ ...VALID_VALUES, title: '  ' })
    expect(result.errors?.title).toBeTruthy()
  })

  it('normalizes empty description to null', () => {
    const result = validateReminderForm({ ...VALID_VALUES, description: '  ' })
    expect(result.input?.description).toBeNull()
  })

  it('rejects a malformed date', () => {
    const result = validateReminderForm({ ...VALID_VALUES, date: 'not-a-date' })
    expect(result.errors?.date).toBeTruthy()
  })

  it('rejects a malformed time', () => {
    const result = validateReminderForm({ ...VALID_VALUES, time: '25:99' })
    expect(result.errors?.time).toBeTruthy()
  })

  it('rejects an impossible calendar date (Esfand 30 in a common year)', () => {
    const result = validateReminderForm({ ...VALID_VALUES, date: '1404/12/30' })
    expect(result.errors?.date).toBeTruthy()
  })
})

describe('toFormDateTime', () => {
  it('round-trips a remindAt back into Jalali date/time form fields', () => {
    const { input } = validateReminderForm(VALID_VALUES)
    const { date, time } = toFormDateTime(input!.remindAt)
    expect(date).toBe('1405/06/10')
    expect(time).toBe('14:30')
  })
})
