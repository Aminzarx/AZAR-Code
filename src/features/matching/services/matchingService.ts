import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'
import { normalizePersianText } from '@shared/utils/persianText'
import { kindsForApplicant, parseDealKinds, type DealKind } from '@shared/utils/dealKinds'
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
 * True when a property offered as `propertyTransactionType` (one or more kinds, «فروش، رهن و اجاره») is what an
 * applicant looking for `applicantTransactionType` wants: a buyer needs a file for sale, a tenant one for رهن و اجاره,
 * a barter applicant one for barter (Amin #5240). When neither side is in the known vocabulary they fall back to
 * normalized exact-match, so free-text entries that happen to agree still count.
 */
export function areTransactionTypesCompatible(
  propertyTransactionType: string | null,
  applicantTransactionType: string | null
): boolean {
  if (!propertyTransactionType?.trim() || !applicantTransactionType?.trim()) {
    return false
  }
  const kinds = parseDealKinds(propertyTransactionType)
  // Amin #5327: an applicant may want several modes; one the file is offered for is enough
  const wanted = kindsForApplicant(applicantTransactionType)
  if (kinds.length > 0 && wanted.length > 0) {
    return kinds.some((k) => wanted.includes(k))
  }
  if (kinds.length > 0 || wanted.length > 0) {
    // one side known, the other not (e.g. a seller-side «فروش» applicant): no match
    return false
  }
  return normalizePersianText(propertyTransactionType) === normalizePersianText(applicantTransactionType)
}

/**
 * Amin #5240: a known deal kind on both sides that does not fit is never a match (a buyer is never shown a file that
 * is only for rent or barter). Unknown on either side stays soft: no points, no exclusion.
 */
function transactionTypesClash(property: Property, applicant: Applicant): boolean {
  const kinds = parseDealKinds(property.transactionType)
  const wanted = kindsForApplicant(applicant.preferredTransactionType)
  return kinds.length > 0 && wanted.length > 0 && !kinds.some((k) => wanted.includes(k))
}

/**
 * Amin #5327: the budget fits when it fits for any mode both sides share. Buy and barter compare the budget range with
 * the price; رهن و اجاره compares the applicant's own «رهن موردنظر» with the file's deposit, or — for an applicant who
 * only rents and has no رهن set (older records) — the budget range with the deposit, as before.
 */
function budgetFits(property: Property, applicant: Applicant): boolean {
  const wanted = kindsForApplicant(applicant.preferredTransactionType)
  if (wanted.length === 0) {
    return isWithinRange(property.price, applicant.minBudget, applicant.maxBudget)
  }
  const offered = parseDealKinds(property.transactionType)
  const shared: DealKind[] = wanted.filter((k) => offered.length === 0 || offered.includes(k))
  return shared.some((kind) => {
    if (kind !== 'رهن و اجاره') {
      return isWithinRange(property.price, applicant.minBudget, applicant.maxBudget)
    }
    if (applicant.depositAmount !== null && applicant.depositAmount > 0) {
      return property.depositAmount !== null && property.depositAmount <= applicant.depositAmount
    }
    return wanted.length === 1 && isWithinRange(property.depositAmount, applicant.minBudget, applicant.maxBudget)
  })
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
 * matching (closed file, deal kinds that do not fit, different cities) rather than merely low-scoring — a
 * different-city pair should never be surfaced as a suggestion at all,
 * per §1 of the forms/matching brief. Missing city data on either side
 * (legacy records) falls back to the old soft scoring instead of a hard
 * block, since we can't determine a mismatch either way.
 */
export function scoreMatch(property: Property, applicant: Applicant): MatchResult | null {
  // Amin #5241: a file with a contract (or a deal at «قرارداد»/«موفق») or an archived one is no longer on offer
  if (property.status !== 'active' || property.closed) {
    return null
  }
  if (transactionTypesClash(property, applicant)) {
    return null
  }
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
  // a tenant's budget is the رهن; everyone else's is the price (sale price or barter value)
  if (budgetFits(property, applicant)) {
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
