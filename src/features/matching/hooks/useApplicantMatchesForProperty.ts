import { useCallback, useEffect, useState } from 'react'
import { useApplicantService } from '@features/applicant/hooks/useApplicantService'
import type { Property } from '@features/property/types'
import type { ApplicantMatch } from '../types'
import { findApplicantMatchesForProperty } from '../services/matchingService'

type UseApplicantMatchesResult = {
  matches: ApplicantMatch[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/** Computed live from the property owner's current applicant list — no persisted match table (see matching feature notes). */
export function useApplicantMatchesForProperty(
  property: Property | null
): UseApplicantMatchesResult {
  const applicantService = useApplicantService()
  const [matches, setMatches] = useState<ApplicantMatch[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!applicantService || !property) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    applicantService
      .listApplicants(property.ownerId)
      .then((applicants) => {
        if (!cancelled) {
          setMatches(findApplicantMatchesForProperty(property, applicants))
          setIsLoading(false)
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError : new Error('خطای نامشخص'))
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applicantService, property, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { matches, isLoading, error, refetch }
}
