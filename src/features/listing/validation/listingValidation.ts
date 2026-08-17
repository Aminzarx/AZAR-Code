import { LISTING_TRANSACTION_TYPES } from '@infrastructure/database/repositories/ListingRepository'
import type { ListingFormErrors, ListingFormValues, ListingTransactionType } from '../types'

export type ValidatedListingInput = {
  transactionType: ListingTransactionType
  totalPrice: number | null
  deposit: number | null
  monthlyRent: number | null
}

function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * crm-architecture-audit-v1.md §3 — sale and rent use different pricing
 * shapes, so "which price field is required" depends on
 * `transactionType`: a generic MoneyInput on a generic Contract/Listing
 * was exactly the thing the brief called out as wrong.
 */
export function validateListingForm(
  values: ListingFormValues
): { input: ValidatedListingInput; errors: null } | { input: null; errors: ListingFormErrors } {
  const errors: ListingFormErrors = {}

  const transactionType = values.transactionType.trim() as ListingTransactionType
  if (!LISTING_TRANSACTION_TYPES.includes(transactionType)) {
    errors.transactionType = 'نوع معامله را انتخاب کنید.'
    return { input: null, errors }
  }

  const totalPrice = parsePositiveNumber(values.totalPrice)
  const deposit = parsePositiveNumber(values.deposit)
  const monthlyRent = parsePositiveNumber(values.monthlyRent)

  if (transactionType === 'sale') {
    if (totalPrice === null) {
      errors.totalPrice = 'قیمت کل الزامی است.'
    }
  } else {
    if (deposit === null && monthlyRent === null) {
      errors.deposit = 'حداقل یکی از ودیعه یا اجاره ماهانه را وارد کنید.'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      transactionType,
      totalPrice: transactionType === 'sale' ? totalPrice : null,
      deposit: transactionType === 'sale' ? null : deposit,
      monthlyRent: transactionType === 'sale' ? null : monthlyRent
    },
    errors: null
  }
}
