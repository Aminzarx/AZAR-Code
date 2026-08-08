import { useCallback, useEffect, useState } from 'react'
import type { DealWithDetails } from '../types'
import { useDealService } from './useDealService'

type UseDealsResult = {
  deals: DealWithDetails[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useDeals(userId: string): UseDealsResult {
  const service = useDealService()
  const [deals, setDeals] = useState<DealWithDetails[] | null>(null)
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
      .listDeals(userId)
      .then((result) => {
        if (!cancelled) {
          setDeals(result)
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
  }, [service, userId, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { deals, isLoading, error, refetch }
}
