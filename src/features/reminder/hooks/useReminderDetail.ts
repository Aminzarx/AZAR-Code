import { useCallback, useEffect, useState } from 'react'
import type { Reminder } from '../types'
import { useReminderService } from './useReminderService'

type UseReminderDetailResult = {
  reminder: Reminder | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useReminderDetail(id: string): UseReminderDetailResult {
  const service = useReminderService()
  const [reminder, setReminder] = useState<Reminder | null>(null)
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
      .getReminder(id)
      .then((result) => {
        if (!cancelled) {
          setReminder(result)
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

  return { reminder, isLoading, error, refetch }
}
