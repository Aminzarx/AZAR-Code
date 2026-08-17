import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import {
  LostReasonRepository,
  type LostReasonRecord
} from '@infrastructure/database/repositories/LostReasonRepository'

/** The 7 system-default lost reasons (migration 0010), read-mostly — same lazy-init shape as useDealService. */
export function useLostReasons(): LostReasonRecord[] {
  const [reasons, setReasons] = useState<LostReasonRecord[]>([])

  useEffect(() => {
    let cancelled = false

    getDatabase().then(async (db) => {
      const result = await new LostReasonRepository(db).getAll()
      if (!cancelled) {
        setReasons(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return reasons
}
