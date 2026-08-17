import type { PropertyFormErrors, PropertyFormValues } from '../types'

export type ValidatedPropertyInput = {
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  address: string
  price: number | null
  area: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
  barterItems: string[]
  barterOtherDescription: string | null
  description: string | null
}

function parsePositiveNumber(
  raw: string,
  field: string,
  errors: PropertyFormErrors
): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) {
    errors[field as keyof PropertyFormValues] = 'عدد معتبر و بزرگ‌تر از صفر وارد کنید.'
    return null
  }
  return value
}

// Distinct from parsePositiveNumber: an explicit 0 is meaningful here
// (rentStatus.ts reads it as "رهن کامل"/"فقط اجاره"), so it must be a
// valid, non-error value rather than rejected the way it is for
// price/area/rooms.
function parseNonNegativeNumber(
  raw: string,
  field: string,
  errors: PropertyFormErrors
): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) {
    errors[field as keyof PropertyFormValues] = 'عدد معتبر و بزرگ‌تر یا مساوی صفر وارد کنید.'
    return null
  }
  return value
}

/**
 * `propertyType`/`transactionType` are deliberately unconstrained free text
 * here too (matches migration 0002's comment — no enum values are decided
 * project-wide yet), so validation only checks the fields that are always
 * required regardless of that open decision.
 */
export function validatePropertyForm(
  values: PropertyFormValues
): { input: ValidatedPropertyInput; errors: null } | { input: null; errors: PropertyFormErrors } {
  const errors: PropertyFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = 'عنوان الزامی است.'
  }
  if (values.city.trim().length === 0) {
    errors.city = 'شهر الزامی است.'
  }
  if (values.address.trim().length === 0) {
    errors.address = 'آدرس الزامی است.'
  }

  const price = parsePositiveNumber(values.price, 'price', errors)
  const area = parsePositiveNumber(values.area, 'area', errors)
  const rooms = parsePositiveNumber(values.rooms, 'rooms', errors)
  const depositAmount = parseNonNegativeNumber(values.depositAmount, 'depositAmount', errors)
  const rentAmount = parseNonNegativeNumber(values.rentAmount, 'rentAmount', errors)

  // "سایر" without a description is a barter item with no actual
  // content — same "required when selected" shape as isConvertible's
  // conditional fields above, just for a checkbox-driven choice instead.
  if (values.barterItems.includes('سایر') && values.barterOtherDescription.trim().length === 0) {
    errors.barterOtherDescription = 'برای گزینه «سایر» توضیح مورد تهاتر را وارد کنید.'
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      title: values.title.trim(),
      propertyType: values.propertyType.trim() || null,
      transactionType: values.transactionType.trim() || null,
      city: values.city.trim(),
      address: values.address.trim(),
      price,
      area,
      rooms,
      depositAmount,
      rentAmount,
      isConvertible: values.isConvertible,
      barterItems: values.barterItems,
      barterOtherDescription: values.barterItems.includes('سایر')
        ? values.barterOtherDescription.trim() || null
        : null,
      description: values.description.trim() || null
    },
    errors: null
  }
}
