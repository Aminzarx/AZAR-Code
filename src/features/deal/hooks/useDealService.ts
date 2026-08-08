import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { generateId } from '@infrastructure/auth/idGenerators'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { DealService } from '../services/DealService'

/** Lazily builds a DealService against the shared (cached) DB connection — same init shape as PropertyService's/ApplicantService's. */
export function useDealService(): DealService | null {
  const [service, setService] = useState<DealService | null>(null)

  useEffect(() => {
    let cancelled = false

    getDatabase().then((db) => {
      if (!cancelled) {
        setService(
          new DealService(
            new DealRepository(db),
            new PropertyService(new PropertyRepository(db), generateId),
            new ApplicantService(new ApplicantRepository(db), generateId),
            generateId
          )
        )
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return service
}
