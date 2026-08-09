import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'
import { normalizePersianText } from '@shared/utils/persianText'
import type { ApplicantMatch, MatchCriterion, MatchResult, PropertyMatch } from '../types'

/**
 * MVP scoring — deliberately simple, additive weights (not ML, not a
 * learned model). Each criterion only counts when the applicant actually
 * expressed a preference for it; an unset preference is neither matched
 * nor penalized, so score is not normalized against a shifting maximum.
 * Weights are illustrative, not a final product decision — the brief
 * explicitly asks that this stay simple and extensible, not tuned.
 */
const CRITERION_WEIGHTS: Record<MatchCriterion, number> = {
  city: 25,
  propertyType: 20,
  transactionType: 15,
  budget: 20,
  area: 10,
  rooms: 10
}

export const CRITERION_LABELS: Record<MatchCriterion, string> = {
  city: 'شهر یکسان',
  propertyType: 'نوع ملک مطابق با ترجیح متقاضی',
  transactionType: 'نوع معامله مطابق با ترجیح متقاضی',
  budget: 'قیمت در محدوده بودجه',
  area: 'متراژ در محدوده موردنظر',
  rooms: 'تعداد اتاق مطابق'
}

/**
 * A property's transaction type -> the applicant-side transaction types
 * compatible with it. Property and applicant use different vocabulary for
 * the same deal (a "for sale" property is what a "buyer" applicant wants),
 * so exact string equality was never the right test — see §1 of the
 * forms/matching polish brief. Unknown/custom free-text values (this
 * field stays unconstrained, see propertyValidation.ts) fall back to
 * exact-match compatibility below.
 */
const TRANSACTION_COMPATIBILITY: Record<string, readonly string[]> = {
  فروش: ['خرید'],
  اجاره: ['اجاره', 'رهن و اجاره', 'رهن', 'استیجاری'],
  'رهن و اجاره': ['اجاره', 'رهن و اجاره', 'رهن', 'استیجاری'],
  رهن: ['اجاره', 'رهن و اجاره', 'رهن', 'استیجاری'],
  // Applicant-only vocabulary — a property's own transaction type is never
  // "buyer", so it can never be compatible with anything on the property side.
  خرید: []
}

/**
 * True when a property listed under `propertyTransactionType` is what an
 * applicant looking for `applicantTransactionType` actually wants — e.g.
 * a "فروش" (for-sale) property matches a "خرید" (buyer) applicant, but not
 * another "فروش" listing's applicant-side counterpart. Values outside the
 * known vocabulary fall back to normalized exact-match, so free-text
 * entries that happen to agree ("فروش" = "فروش") still count.
 */
export function areTransactionTypesCompatible(
  propertyTransactionType: string | null,
  applicantTransactionType: string | null
): boolean {
  if (!propertyTransactionType?.trim() || !applicantTransactionType?.trim()) {
    return false
  }
  const normalizedProperty = normalizePersianText(propertyTransactionType)
  const normalizedApplicant = normalizePersianText(applicantTransactionType)
  const compatibleValues = TRANSACTION_COMPATIBILITY[normalizedProperty]
  if (compatibleValues) {
    return compatibleValues.map(normalizePersianText).includes(normalizedApplicant)
  }
  return normalizedProperty === normalizedApplicant
}

/** Normalized equality — collapses Arabic/Persian character variants and stray whitespace. See persianText.ts. */
export function citiesMatch(propertyCity: string, applicantCity: string): boolean {
  return normalizePersianText(propertyCity) === normalizePersianText(applicantCity)
}

function isWithinRange(value: number | null, min: number | null, max: number | null): boolean {
  if (value === null || (min === null && max === null)) {
    return false
  }
  if (min !== null && value < min) {
    return false
  }
  if (max !== null && value > max) {
    return false
  }
  return true
}

/**
 * Returns null when the property/applicant are hard-excluded from
 * matching (different cities) rather than merely low-scoring — a
 * different-city pair should never be surfaced as a suggestion at all,
 * per §1 of the forms/matching brief. Missing city data on either side
 * (legacy records) falls back to the old soft scoring instead of a hard
 * block, since we can't determine a mismatch either way.
 */
export function scoreMatch(property: Property, applicant: Applicant): MatchResult | null {
  const bothCitiesKnown = Boolean(property.city.trim() && applicant.city.trim())
  const sameCity = citiesMatch(property.city, applicant.city)
  if (bothCitiesKnown && !sameCity) {
    return null
  }

  const matchedCriteria: MatchCriterion[] = []

  if (bothCitiesKnown && sameCity) {
    matchedCriteria.push('city')
  }
  if (
    applicant.preferredPropertyType &&
    property.propertyType &&
    normalizePersianText(applicant.preferredPropertyType) ===
      normalizePersianText(property.propertyType)
  ) {
    matchedCriteria.push('propertyType')
  }
  if (areTransactionTypesCompatible(property.transactionType, applicant.preferredTransactionType)) {
    matchedCriteria.push('transactionType')
  }
  if (isWithinRange(property.price, applicant.minBudget, applicant.maxBudget)) {
    matchedCriteria.push('budget')
  }
  if (isWithinRange(property.area, applicant.minArea, applicant.maxArea)) {
    matchedCriteria.push('area')
  }
  if (applicant.rooms !== null && property.rooms !== null && applicant.rooms === property.rooms) {
    matchedCriteria.push('rooms')
  }

  const score = matchedCriteria.reduce((sum, criterion) => sum + CRITERION_WEIGHTS[criterion], 0)
  return { score, matchedCriteria }
}

/** Sorted by score descending; excluded (different-city) and zero-score results are dropped as not worth surfacing. */
export function findPropertyMatchesForApplicant(
  applicant: Applicant,
  properties: Property[]
): PropertyMatch[] {
  return properties
    .map((property) => {
      const result = scoreMatch(property, applicant)
      return result && { property, ...result }
    })
    .filter((match): match is PropertyMatch => match !== null && match.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function findApplicantMatchesForProperty(
  property: Property,
  applicants: Applicant[]
): ApplicantMatch[] {
  return applicants
    .map((applicant) => {
      const result = scoreMatch(property, applicant)
      return result && { applicant, ...result }
    })
    .filter((match): match is ApplicantMatch => match !== null && match.score > 0)
    .sort((a, b) => b.score - a.score)
}
