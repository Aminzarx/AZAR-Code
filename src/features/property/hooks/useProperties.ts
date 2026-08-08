import { useCallback, useEffect, useState } from 'react'
import type { Property } from '../types'
import { usePropertyService } from './usePropertyService'

type UsePropertiesResult = {
  properties: Property[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useProperties(ownerId: string, search: string): UsePropertiesResult {
  const service = usePropertyService()
  const [properties, setProperties] = useState<Property[] | null>(null)
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
      .listProperties(ownerId, search)
      .then((result) => {
        if (!cancelled) {
          setProperties(result)
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
  }, [service, ownerId, search, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { properties, isLoading, error, refetch }
}
