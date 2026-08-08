import { useCallback, useEffect, useState } from 'react'
import { usePropertyService } from '@features/property/hooks/usePropertyService'
import type { Applicant } from '@features/applicant/types'
import type { PropertyMatch } from '../types'
import { findPropertyMatchesForApplicant } from '../services/matchingService'

type UsePropertyMatchesResult = {
  matches: PropertyMatch[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/** Computed live from the applicant's owner's current property list — no persisted match table (see matching feature notes). */
export function usePropertyMatchesForApplicant(
  applicant: Applicant | null
): UsePropertyMatchesResult {
  const propertyService = usePropertyService()
  const [matches, setMatches] = useState<PropertyMatch[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!propertyService || !applicant) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    propertyService
      .listProperties(applicant.userId)
      .then((properties) => {
        if (!cancelled) {
          setMatches(findPropertyMatchesForApplicant(applicant, properties))
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
  }, [propertyService, applicant, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { matches, isLoading, error, refetch }
}
