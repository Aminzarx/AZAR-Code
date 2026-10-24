import { jalaliToGregorianIso, parseJalaliDate } from '@shared/utils/jalaliDate'
import type { ContractFormErrors, ContractFormValues } from '../types'

export type ValidatedContractInput = {
  type: string | null
  amount: number | null
  /** Gregorian ISO (`YYYY-MM-DD`) — the form field itself holds Jalali text; this is the converted, storage-ready value. */
  startDate: string
  endDate: string
  notes: string | null
  trackingCode: string | null
}

export function validateContractForm(
  values: ContractFormValues
): { input: ValidatedContractInput; errors: null } | { input: null; errors: ContractFormErrors } {
  const errors: ContractFormErrors = {}

  const parsedStartDate = parseJalaliDate(values.startDate)
  if (!parsedStartDate) {
    // short: the two dates sit side by side, a long line wrapped into four (emulator test 2026-10-24)
    errors.startDate = 'مثل ۱۴۰۵/۰۵/۱۲ وارد کنید.'
  }

  const parsedEndDate = parseJalaliDate(values.endDate)
  if (!parsedEndDate) {
    errors.endDate = 'مثل ۱۴۰۵/۰۵/۱۲ وارد کنید.'
  }

  const startDate = parsedStartDate ? jalaliToGregorianIso(parsedStartDate) : ''
  const endDate = parsedEndDate ? jalaliToGregorianIso(parsedEndDate) : ''

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
      notes: values.notes.trim() || null,
      trackingCode: values.trackingCode.trim() || null
    },
    errors: null
  }
}
