import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import {
  DealRepository,
  type DealRecord
} from '@infrastructure/database/repositories/DealRepository'
import {
  ReminderRepository,
  type ReminderRecord
} from '@infrastructure/database/repositories/ReminderRepository'

type UsePropertyActivityResult = {
  deals: DealRecord[] | null
  reminders: ReminderRecord[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Backs both the Detail screen's derived status (design-system.md §6.5)
 * and its Activity section (§13 of the brief) — one query pair per
 * screen visit, not per row, using the existing
 * `DealRepository.getByProperty` / new `ReminderRepository.getByProperty`
 * read methods.
 */
export function usePropertyActivity(propertyId: string): UsePropertyActivityResult {
  const [deals, setDeals] = useState<DealRecord[] | null>(null)
  const [reminders, setReminders] = useState<ReminderRecord[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    getDatabase()
      .then(async (db) => {
        const dealRepository = new DealRepository(db)
        const reminderRepository = new ReminderRepository(db)
        const [dealResult, reminderResult] = await Promise.all([
          dealRepository.getByProperty(propertyId),
          reminderRepository.getByProperty(propertyId)
        ])
        if (!cancelled) {
          setDeals(dealResult)
          setReminders(reminderResult)
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
  }, [propertyId, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { deals, reminders, isLoading, error, refetch }
}
