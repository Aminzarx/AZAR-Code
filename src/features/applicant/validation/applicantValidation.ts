import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

export type ValidatedApplicantInput = {
  fullName: string
  phoneNumber: string
  preferredTransactionType: string | null
  preferredPropertyType: string | null
  city: string
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
  description: string | null
}

function parsePositiveNumber(
  raw: string,
  field: string,
  errors: ApplicantFormErrors
): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) {
    errors[field as keyof ApplicantFormValues] = 'عدد معتبر و بزرگ‌تر از صفر وارد کنید.'
    return null
  }
  return value
}

// Distinct from parsePositiveNumber: an explicit 0 is meaningful here
// (rentStatus.ts reads it as "رهن کامل"/"فقط اجاره"), so it must be a
// valid, non-error value rather than rejected the way it is for the
// budget/area/rooms fields above.
function parseNonNegativeNumber(
  raw: string,
  field: string,
  errors: ApplicantFormErrors
): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) {
    errors[field as keyof ApplicantFormValues] = 'عدد معتبر و بزرگ‌تر یا مساوی صفر وارد کنید.'
    return null
  }
  return value
}

/**
 * `preferredTransactionType`/`preferredPropertyType` stay unconstrained
 * free text, matching migration 0003's comment — no enum values are
 * decided project-wide yet.
 */
export function validateApplicantForm(
  values: ApplicantFormValues
): { input: ValidatedApplicantInput; errors: null } | { input: null; errors: ApplicantFormErrors } {
  const errors: ApplicantFormErrors = {}

  if (values.fullName.trim().length === 0) {
    errors.fullName = 'نام الزامی است.'
  }
  if (values.phoneNumber.trim().length === 0) {
    errors.phoneNumber = 'شماره تماس الزامی است.'
  }
  if (values.city.trim().length === 0) {
    errors.city = 'شهر الزامی است.'
  }

  const minBudget = parsePositiveNumber(values.minBudget, 'minBudget', errors)
  const maxBudget = parsePositiveNumber(values.maxBudget, 'maxBudget', errors)
  const minArea = parsePositiveNumber(values.minArea, 'minArea', errors)
  const maxArea = parsePositiveNumber(values.maxArea, 'maxArea', errors)
  const rooms = parsePositiveNumber(values.rooms, 'rooms', errors)
  const depositAmount = parseNonNegativeNumber(values.depositAmount, 'depositAmount', errors)
  const rentAmount = parseNonNegativeNumber(values.rentAmount, 'rentAmount', errors)

  if (minBudget !== null && maxBudget !== null && maxBudget < minBudget) {
    errors.maxBudget = 'سقف بودجه باید بزرگ‌تر یا مساوی حداقل بودجه باشد.'
  }
  if (minArea !== null && maxArea !== null && maxArea < minArea) {
    errors.maxArea = 'حداکثر متراژ باید بزرگ‌تر یا مساوی حداقل متراژ باشد.'
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      fullName: values.fullName.trim(),
      phoneNumber: values.phoneNumber.trim(),
      preferredTransactionType: values.preferredTransactionType.trim() || null,
      preferredPropertyType: values.preferredPropertyType.trim() || null,
      city: values.city.trim(),
      minBudget,
      maxBudget,
      minArea,
      maxArea,
      rooms,
      depositAmount,
      rentAmount,
      isConvertible: values.isConvertible,
      description: values.description.trim() || null
    },
    errors: null
  }
}
