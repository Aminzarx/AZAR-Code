import { useCallback, useEffect, useState } from 'react'
import { fetchDashboardData } from '../services/mockDashboardService'
import type { DashboardData } from '../types'

type DashboardDataState = {
  data: DashboardData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useDashboardData(): DashboardDataState {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchDashboardData()
      .then((result) => {
        if (!cancelled) {
          setData(result)
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
  }, [attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { data, isLoading, error, refetch }
}
