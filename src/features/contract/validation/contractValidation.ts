import type { ContractFormErrors, ContractFormValues } from '../types'

export type ValidatedContractInput = {
  type: string | null
  amount: number | null
  startDate: string
  endDate: string
  notes: string | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(`${value}T00:00:00`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  )
}

export function validateContractForm(
  values: ContractFormValues
): { input: ValidatedContractInput; errors: null } | { input: null; errors: ContractFormErrors } {
  const errors: ContractFormErrors = {}

  const startDate = values.startDate.trim()
  if (!DATE_PATTERN.test(startDate) || !isRealCalendarDate(startDate)) {
    errors.startDate = 'تاریخ شروع را به‌صورت ۱۴۰۴-۰۵-۲۰ (سال-ماه-روز) وارد کنید.'
  }

  const endDate = values.endDate.trim()
  if (!DATE_PATTERN.test(endDate) || !isRealCalendarDate(endDate)) {
    errors.endDate = 'تاریخ پایان را به‌صورت ۱۴۰۴-۰۵-۲۰ (سال-ماه-روز) وارد کنید.'
  }

  if (!errors.startDate && !errors.endDate && endDate < startDate) {
    errors.endDate = 'تاریخ پایان باید بعد از تاریخ شروع باشد.'
  }

  let amount: number | null = null
  const trimmedAmount = values.amount.trim()
  if (trimmedAmount.length > 0) {
    const parsedAmount = Number(trimmedAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'مبلغ باید عدد معتبر و بزرگ‌تر از صفر باشد.'
    } else {
      amount = parsedAmount
    }
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      type: values.type.trim() || null,
      amount,
      startDate,
      endDate,
      notes: values.notes.trim() || null
    },
    errors: null
  }
}
