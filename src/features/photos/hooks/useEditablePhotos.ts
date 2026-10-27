import { useCallback, useState } from 'react'
import type { PhotoSubject } from '@infrastructure/database/repositories/PhotoRepository'
import { usePhotoAdder, type PhotoAdder } from '../components/PhotoAddButton'
import type { EditorPhoto } from '../photoList'
import { usePhotoRepository } from './usePhotoRepository'

export type EditablePhotos = {
  photos: EditorPhoto[]
  setPhotos: (photos: EditorPhoto[]) => void
  adder: PhotoAdder
  /** fills the editor with the saved photos, in their order */
  load: () => Promise<void>
  /** writes the editor's list back (removed ones go, new ones are added, the order is kept) */
  save: (userId: string) => Promise<void>
  /** changes after each save, so the page's PhotoStrip reloads */
  version: number
}

/** Amin #5352: the photos of a file or contract, editable on its «ویرایش» page like on the new-file steps. */
export function useEditablePhotos(subjectType: PhotoSubject, subjectId: string | undefined): EditablePhotos {
  const repository = usePhotoRepository()
  const [photos, setPhotos] = useState<EditorPhoto[]>([])
  const [version, setVersion] = useState(0)
  const adder = usePhotoAdder(photos, setPhotos)

  const load = useCallback(async () => {
    if (!repository || !subjectId) return
    const saved = await repository.listFor(subjectType, subjectId)
    setPhotos(saved.map((photo) => ({ id: photo.id, bytes: photo.bytes, data: photo.data, blobHash: photo.blobHash, key: photo.id })))
  }, [repository, subjectType, subjectId])

  const save = useCallback(
    async (userId: string) => {
      if (!repository || !subjectId) return
      await repository.replaceFor(userId, subjectType, subjectId, photos)
      setVersion((current) => current + 1)
    },
    [repository, subjectType, subjectId, photos]
  )

  return { photos, setPhotos, adder, load, save, version }
}
