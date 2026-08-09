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
      description: values.description.trim() || null
    },
    errors: null
  }
}
