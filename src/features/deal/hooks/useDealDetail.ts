import { useCallback, useEffect, useState, useRef } from 'react'
import type { DealWithDetails } from '../types'
import { useDealService } from './useDealService'

type UseDealDetailResult = {
  deal: DealWithDetails | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useDealDetail(id: string): UseDealDetailResult {
  const service = useDealService()
  const [deal, setDeal] = useState<DealWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Amin #5561: once there is something on screen, a refresh keeps it there (no spinner swap, no jump)
  const hasLoaded = useRef(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!service) {
      return
    }
    let cancelled = false
    if (!hasLoaded.current) setIsLoading(true)
    setError(null)

    service
      .getDeal(id)
      .then((result) => {
        if (!cancelled) {
          setDeal(result)
          hasLoaded.current = true
          setIsLoading(false)
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError : new Error('خطای نامشخص'))
          hasLoaded.current = true
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [service, id, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { deal, isLoading, error, refetch }
}
