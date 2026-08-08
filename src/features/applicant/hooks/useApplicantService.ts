import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { generateId } from '@infrastructure/auth/idGenerators'
import { ApplicantService } from '../services/ApplicantService'

/** Lazily builds an ApplicantService against the shared (cached) DB connection — same init shape as PropertyService's. */
export function useApplicantService(): ApplicantService | null {
  const [service, setService] = useState<ApplicantService | null>(null)

  useEffect(() => {
    let cancelled = false

    getDatabase().then((db) => {
      if (!cancelled) {
        setService(new ApplicantService(new ApplicantRepository(db), generateId))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return service
}
