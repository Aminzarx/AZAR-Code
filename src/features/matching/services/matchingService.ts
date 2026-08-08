import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'
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

export function scoreMatch(property: Property, applicant: Applicant): MatchResult {
  const matchedCriteria: MatchCriterion[] = []

  if (
    applicant.city.trim() &&
    property.city.trim() &&
    applicant.city.trim() === property.city.trim()
  ) {
    matchedCriteria.push('city')
  }
  if (
    applicant.preferredPropertyType &&
    property.propertyType &&
    applicant.preferredPropertyType === property.propertyType
  ) {
    matchedCriteria.push('propertyType')
  }
  if (
    applicant.preferredTransactionType &&
    property.transactionType &&
    applicant.preferredTransactionType === property.transactionType
  ) {
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

/** Sorted by score descending; zero-score (no shared criteria) results are dropped as not worth surfacing. */
export function findPropertyMatchesForApplicant(
  applicant: Applicant,
  properties: Property[]
): PropertyMatch[] {
  return properties
    .map((property) => ({ property, ...scoreMatch(property, applicant) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function findApplicantMatchesForProperty(
  property: Property,
  applicants: Applicant[]
): ApplicantMatch[] {
  return applicants
    .map((applicant) => ({ applicant, ...scoreMatch(property, applicant) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
}
