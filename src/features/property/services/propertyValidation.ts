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
      description: values.description.trim() || null
    },
    errors: null
  }
}
