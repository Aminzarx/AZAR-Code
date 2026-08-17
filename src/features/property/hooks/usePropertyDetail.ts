import { useCallback, useEffect, useState } from 'react'
import type { Property } from '../types'
import { usePropertyService } from './usePropertyService'

type UsePropertyDetailResult = {
  property: Property | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function usePropertyDetail(id: string): UsePropertyDetailResult {
  const service = usePropertyService()
  const [property, setProperty] = useState<Property | null>(null)
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
      .getProperty(id)
      .then((result) => {
        if (!cancelled) {
          setProperty(result)
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

  return { property, isLoading, error, refetch }
}
