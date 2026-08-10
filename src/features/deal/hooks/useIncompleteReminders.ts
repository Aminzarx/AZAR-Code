import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import {
  ReminderRepository,
  type ReminderRecord
} from '@infrastructure/database/repositories/ReminderRepository'

type UseIncompleteRemindersResult = {
  reminders: ReminderRecord[] | null
  refetch: () => void
}

/**
 * One query for every not-done reminder the user has, reused by Deal
 * List to show a per-row "next action" hint (grouped by `dealId` in
 * memory) — not a per-row query, same "one fetch for the whole screen"
 * shape as `PropertyListScreen`'s `matchCounts`.
 */
export function useIncompleteReminders(userId: string): UseIncompleteRemindersResult {
  const [reminders, setReminders] = useState<ReminderRecord[] | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) {
      return
    }
    let cancelled = false

    getDatabase()
      .then(async (db) => {
        const result = await new ReminderRepository(db).getIncomplete(userId)
        if (!cancelled) {
          setReminders(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReminders(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  const refetch = useCallback(() => setAttempt((current) => current + 1), [])

  return { reminders, refetch }
}
