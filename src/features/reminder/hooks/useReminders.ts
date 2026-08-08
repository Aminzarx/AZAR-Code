import { useCallback, useEffect, useState } from 'react'
import type { Reminder } from '../types'
import { useReminderService } from './useReminderService'

type UseRemindersResult = {
  reminders: Reminder[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useReminders(userId: string): UseRemindersResult {
  const service = useReminderService()
  const [reminders, setReminders] = useState<Reminder[] | null>(null)
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
      .listReminders(userId)
      .then((result) => {
        if (!cancelled) {
          setReminders(result)
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

  return { reminders, isLoading, error, refetch }
}
