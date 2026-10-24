import type { Migration } from '../types'
import { triggersFor } from './0019_server_sync'

/**
 * Amin #5062: photos of a property file or a contract, in their own synced table (one row per photo, in order).
 * - `data`: the WebP (base64) while the photo has not reached the server yet. Like every file row it is only in
 *   memory and in the encrypted queue (option A).
 * - `blob_hash`: once it is on the server (POST /sync/blob/put, counted there by its exact WebP size), the row
 *   keeps only this and `data` is emptied.
 * - `bytes`: the WebP size, what the photo costs in storage tokens.
 * The subject (a property or a contract) is named by type and id; deleting it deletes its photos (PhotoService).
 */
export const PHOTO_TABLES = ['photos'] as const

export const migration0021Photos: Migration = {
  version: 21,
  description: 'Photos of property files and contracts (synced; bytes on the server as blobs)',
  statements: [
    `CREATE TABLE photos (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      subject_type TEXT NOT NULL CHECK (subject_type IN ('property', 'contract')),
      subject_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      blob_hash TEXT,
      data TEXT,
      bytes INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_photos_subject ON photos(subject_type, subject_id, position)`,
    ...triggersFor('photos', (r) => `${r}.id`)
  ]
}
