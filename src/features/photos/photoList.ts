import type { DraftPhoto } from '@infrastructure/database/repositories/PhotoRepository'

/** Amin #5062: a photo in the «عکس‌ها» step — new (with its bytes) or already saved (by id). */
export type EditorPhoto = DraftPhoto & { key: string }

/** Moves the photo at `index` one place earlier (-1) or later (+1); the list is unchanged at the ends. */
export function movePhoto<T>(photos: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || index >= photos.length || target < 0 || target >= photos.length) return [...photos]
  const next = [...photos]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved as T)
  return next
}
