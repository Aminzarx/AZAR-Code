import { useCallback, useEffect, useState } from 'react'
import type { Applicant } from '../types'
import { useApplicantService } from './useApplicantService'

type UseApplicantDetailResult = {
  applicant: Applicant | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useApplicantDetail(id: string): UseApplicantDetailResult {
  const service = useApplicantService()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
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
      .getApplicant(id)
      .then((result) => {
        if (!cancelled) {
          setApplicant(result)
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
  }, [service, id, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { applicant, isLoading, error, refetch }
}
