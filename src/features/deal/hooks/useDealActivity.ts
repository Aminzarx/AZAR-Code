import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import {
  DealRepository,
  type DealStageHistoryRecord
} from '@infrastructure/database/repositories/DealRepository'
import {
  ReminderRepository,
  type ReminderRecord
} from '@infrastructure/database/repositories/ReminderRepository'

type UseDealActivityResult = {
  stageHistory: DealStageHistoryRecord[] | null
  reminders: ReminderRecord[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Backs Deal Detail's Next Action (§17.2) and Activity section — one
 * query pair per screen visit, using the existing `DealRepository.getStageHistory`
 * and new `ReminderRepository.getByDeal` read methods. Same shape as
 * `usePropertyActivity`.
 */
export function useDealActivity(dealId: string): UseDealActivityResult {
  const [stageHistory, setStageHistory] = useState<DealStageHistoryRecord[] | null>(null)
  const [reminders, setReminders] = useState<ReminderRecord[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!dealId) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)

    getDatabase()
      .then(async (db) => {
        const dealRepository = new DealRepository(db)
        const reminderRepository = new ReminderRepository(db)
        const [stageHistoryResult, reminderResult] = await Promise.all([
          dealRepository.getStageHistory(dealId),
          reminderRepository.getByDeal(dealId)
        ])
        if (!cancelled) {
          setStageHistory(stageHistoryResult)
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
  }, [dealId, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { stageHistory, reminders, isLoading, error, refetch }
}
