import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'

export type MatchCriterion =
  'city' | 'propertyType' | 'transactionType' | 'budget' | 'area' | 'rooms'

export type MatchResult = {
  /** 0-100, sum of matched criteria weights. Not normalized against a shifting max — see matchingService.ts. */
  score: number
  matchedCriteria: MatchCriterion[]
}

export type PropertyMatch = MatchResult & { property: Property }
export type ApplicantMatch = MatchResult & { applicant: Applicant }
