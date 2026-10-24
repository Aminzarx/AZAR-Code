import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useFilesVersion } from '@shared/hooks/useFilesVersion'
import { fetchDashboardData } from '../services/dashboardDataService'
import type { DashboardData } from '../types'

type DashboardDataState = {
  data: DashboardData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useDashboardData(ownerId: string): DashboardDataState {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // option A (Amin #4826): re-read when the account's files arrive from the server while Home is open
  const filesVersion = useFilesVersion()

  const load = useCallback(() => {
    void filesVersion // a new version of the files means a new read
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchDashboardData(ownerId)
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
  }, [ownerId, filesVersion])

  // Dashboard is a bottom-tab screen, so it stays mounted (not
  // unmounted/remounted) when the user switches to another tab and back
  // — a plain mount-only fetch never re-ran after creating a property or
  // applicant from the Dashboard's own quick actions, so stats/recent
  // activity stayed stale until the app restarted. useFocusEffect
  // refetches every time this screen becomes the active tab, including
  // the very first time (covering the old mount-fetch case too).
  useFocusEffect(load)

  const refetch = useCallback(() => {
    load()
  }, [load])

  return { data, isLoading, error, refetch }
}
