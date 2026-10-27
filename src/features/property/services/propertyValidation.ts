import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import { toEnglishDigits } from '@shared/utils/persianText'
import { joinDealKinds, parseDealKinds } from '@shared/utils/dealKinds'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

/** Amin #5066: the file's owner (kept as a contact with the «مالک» role). */
export type PropertyOwnerInput = {
  fullName: string
  /** canonical +98… */
  phoneNumber: string
  notes: string | null
}

export type ValidatedPropertyInput = {
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  region: string | null
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
  /** null = no owner given */
  owner: PropertyOwnerInput | null
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

  // Amin #5240: one or more deal kinds, each with its own required fields; a kind not chosen keeps nothing
  const kinds = parseDealKinds(values.transactionType)
  const forSale = kinds.includes('فروش')
  const forRent = kinds.includes('رهن و اجاره')
  const forBarter = kinds.includes('تهاتر')
  if (kinds.length === 0) {
    errors.transactionType = 'نوع معامله را انتخاب کنید.'
  }

  const usesPrice = forSale || forBarter
  const price = usesPrice ? parsePositiveNumber(values.price, 'price', errors) : null
  if (usesPrice && values.price.trim().length === 0) {
    errors.price = forSale ? 'قیمت فروش را وارد کنید.' : 'ارزش ملک را وارد کنید.'
  }
  const area = parsePositiveNumber(values.area, 'area', errors)
  const rooms = parsePositiveNumber(values.rooms, 'rooms', errors)
  const depositAmount = forRent ? parseNonNegativeNumber(values.depositAmount, 'depositAmount', errors) : null
  const rentAmount = forRent ? parseNonNegativeNumber(values.rentAmount, 'rentAmount', errors) : null
  if (forRent) {
    if (values.depositAmount.trim().length === 0) errors.depositAmount = 'میزان رهن را وارد کنید (۰ برای فقط اجاره).'
    if (values.rentAmount.trim().length === 0) errors.rentAmount = 'میزان اجاره را وارد کنید (۰ برای رهن کامل).'
    if (depositAmount === 0 && rentAmount === 0) errors.rentAmount = 'رهن و اجاره هر دو صفر نمی‌شوند.'
  }

  const barterItems = forBarter ? values.barterItems : []
  if (forBarter && barterItems.length === 0) {
    errors.barterItems = 'دست‌کم یک مورد تهاتر را انتخاب کنید.'
  }
  // "سایر" without a description is a barter item with no actual content
  if (barterItems.includes('سایر') && values.barterOtherDescription.trim().length === 0) {
    errors.barterOtherDescription = 'برای گزینه «سایر» توضیح مورد تهاتر را وارد کنید.'
  }

  const ownerName = (values.ownerName ?? '').trim()
  const ownerPhoneRaw = toEnglishDigits(values.ownerPhone ?? '').trim()
  const ownerNotes = (values.ownerNotes ?? '').trim()
  const ownerPhone = canonicalizeIranPhoneNumber(ownerPhoneRaw)
  const hasOwner = ownerName.length > 0 || ownerPhoneRaw.length > 0 || ownerNotes.length > 0
  if (hasOwner) {
    if (ownerName.length === 0) errors.ownerName = 'نام مالک را وارد کنید.'
    if (!ownerPhone) errors.ownerPhone = 'شماره موبایل معتبر وارد کنید (مثلاً 09121234567).'
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      title: values.title.trim(),
      propertyType: values.propertyType.trim() || null,
      transactionType: joinDealKinds(kinds) || null,
      city: values.city.trim(),
      region: (values.region ?? '').trim() || null,
      address: values.address.trim(),
      price,
      area,
      rooms,
      depositAmount,
      rentAmount,
      isConvertible: forRent && values.isConvertible,
      barterItems,
      barterOtherDescription: barterItems.includes('سایر')
        ? values.barterOtherDescription.trim() || null
        : null,
      description: values.description.trim() || null,
      owner: hasOwner
        ? { fullName: ownerName, phoneNumber: ownerPhone as string, notes: ownerNotes || null }
        : null
    },
    errors: null
  }
}
