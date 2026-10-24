import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { PhotoRepository } from '@infrastructure/database/repositories/PhotoRepository'
import { generateId } from '@infrastructure/auth/idGenerators'

/** Amin #5062: the photos of files and contracts, against the shared working database. */
export function usePhotoRepository(): PhotoRepository | null {
  const [repository, setRepository] = useState<PhotoRepository | null>(null)

  useEffect(() => {
    let cancelled = false
    getDatabase().then((db) => {
      if (!cancelled) setRepository(new PhotoRepository(db, generateId))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return repository
}
