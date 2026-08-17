import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { generateId } from '@infrastructure/auth/idGenerators'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { ContractService } from '../services/ContractService'

/** Lazily builds a ContractService against the shared (cached) DB connection — same init shape as DealService's/ReminderService's. */
export function useContractService(): ContractService | null {
  const [service, setService] = useState<ContractService | null>(null)

  useEffect(() => {
    let cancelled = false

    getDatabase().then((db) => {
      if (!cancelled) {
        setService(
          new ContractService(
            new ContractRepository(db),
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
