import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { generateId } from '@infrastructure/auth/idGenerators'
import { ReminderService } from '../services/ReminderService'

/** Lazily builds a ReminderService against the shared (cached) DB connection — same init shape as the other feature services. */
export function useReminderService(): ReminderService | null {
  const [service, setService] = useState<ReminderService | null>(null)

  useEffect(() => {
    let cancelled = false

    getDatabase().then((db) => {
      if (!cancelled) {
        setService(
          new ReminderService(new ReminderRepository(db), generateId, new DealRepository(db))
        )
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return service
}
