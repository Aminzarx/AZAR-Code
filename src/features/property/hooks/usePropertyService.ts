import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { generateId } from '@infrastructure/auth/idGenerators'
import { PropertyService } from '../services/PropertyService'

/** Lazily builds a PropertyService against the shared (cached) DB connection — same init shape as AuthProvider's. */
export function usePropertyService(): PropertyService | null {
  const [service, setService] = useState<PropertyService | null>(null)

  useEffect(() => {
    let cancelled = false

    getDatabase().then((db) => {
      if (!cancelled) {
        setService(new PropertyService(new PropertyRepository(db), generateId))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return service
}
