import { useCallback, useEffect, useState } from 'react'
import type { Applicant } from '../types'
import { useApplicantService } from './useApplicantService'

type UseApplicantsResult = {
  applicants: Applicant[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useApplicants(userId: string, search: string): UseApplicantsResult {
  const service = useApplicantService()
  const [applicants, setApplicants] = useState<Applicant[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!service) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    service
      .listApplicants(userId, search)
      .then((result) => {
        if (!cancelled) {
          setApplicants(result)
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
  }, [service, userId, search, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { applicants, isLoading, error, refetch }
}
