import type { DB } from '@op-engineering/op-sqlite'

export type PhotoSubject = 'property' | 'contract'

/** Amin #5062: one photo of a property file or a contract (see migration 0021). */
export type PhotoRecord = {
  id: string
  subjectType: PhotoSubject
  subjectId: string
  position: number
  /** set once the photo is on the server */
  blobHash: string | null
  /** the WebP (base64) while it is not on the server yet */
  data: string | null
  bytes: number
  width: number | null
  height: number | null
}

/** A photo in a form: an existing one (by id) or a new one with its bytes. */
export type DraftPhoto =
  | { id: string; bytes: number; data?: string | null; blobHash?: string | null }
  | { id?: undefined; data: string; bytes: number; width: number; height: number }

/** sync_state key: hashes of removed photos whose server copy is to be deleted on the next push */
export const BLOB_TRASH_KEY = 'blob_trash'

function toPhoto(row: Record<string, unknown>): PhotoRecord {
  return {
    id: row.id as string,
    subjectType: row.subject_type as PhotoSubject,
    subjectId: row.subject_id as string,
    position: Number(row.position),
    blobHash: (row.blob_hash as string | null) ?? null,
    data: (row.data as string | null) ?? null,
    bytes: Number(row.bytes),
    width: row.width === null || row.width === undefined ? null : Number(row.width),
    height: row.height === null || row.height === undefined ? null : Number(row.height)
  }
}

export class PhotoRepository {
  constructor(
    private readonly db: DB,
    private readonly generateId: () => string
  ) {}

  async listFor(subjectType: PhotoSubject, subjectId: string): Promise<PhotoRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM photos WHERE subject_type = ? AND subject_id = ? ORDER BY position, created_at',
      [subjectType, subjectId]
    )
    return result.rows.map(toPhoto)
  }

  /**
   * Makes the subject's photos exactly `photos`, in that order: new ones are added, the order is saved, and the
   * ones left out are deleted (their server copy is queued for deletion, which gives their tokens back).
   */
  async replaceFor(
    userId: string,
    subjectType: PhotoSubject,
    subjectId: string,
    photos: readonly DraftPhoto[]
  ): Promise<PhotoRecord[]> {
    const current = await this.listFor(subjectType, subjectId)
    const kept = new Set(photos.map((p) => p.id).filter((id): id is string => Boolean(id)))
    await this.remove(current.filter((p) => !kept.has(p.id)))
    const now = new Date().toISOString()
    for (const [position, photo] of photos.entries()) {
      if (photo.id !== undefined) {
        const before = current.find((p) => p.id === photo.id)
        if (before && before.position !== position) {
          await this.db.execute('UPDATE photos SET position = ?, updated_at = ? WHERE id = ?', [
            position,
            now,
            photo.id
          ])
        }
        continue
      }
      await this.db.execute(
        `INSERT INTO photos
          (id, user_id, subject_type, subject_id, position, blob_hash, data, bytes, width, height, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        [
          this.generateId(),
          userId,
          subjectType,
          subjectId,
          position,
          photo.data,
          photo.bytes,
          photo.width,
          photo.height,
          now,
          now
        ]
      )
    }
    return this.listFor(subjectType, subjectId)
  }

  /** The subject was deleted: its photos go too. */
  async deleteFor(subjectType: PhotoSubject, subjectId: string): Promise<void> {
    await this.remove(await this.listFor(subjectType, subjectId))
  }

  /** Total WebP size of the subject's photos (what they cost in storage tokens). */
  async bytesFor(subjectType: PhotoSubject, subjectId: string): Promise<number> {
    const result = await this.db.execute(
      'SELECT COALESCE(SUM(bytes), 0) AS b FROM photos WHERE subject_type = ? AND subject_id = ?',
      [subjectType, subjectId]
    )
    return Number(result.rows[0]?.b ?? 0)
  }

  private async remove(photos: readonly PhotoRecord[]): Promise<void> {
    if (photos.length === 0) return
    const hashes = photos.map((p) => p.blobHash).filter((h): h is string => Boolean(h))
    for (const photo of photos) {
      await this.db.execute('DELETE FROM photos WHERE id = ?', [photo.id])
    }
    if (hashes.length === 0) return
    const raw = (
      await this.db.execute('SELECT value FROM sync_state WHERE key = ?', [BLOB_TRASH_KEY])
    ).rows[0]?.value as string | undefined
    const trash = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    for (const hash of hashes) trash.add(hash)
    await this.db.execute(
      'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [BLOB_TRASH_KEY, JSON.stringify([...trash])]
    )
  }
}
