import type { Migration } from '../types'

/**
 * `properties` is a new, standalone table — deliberately not an extension
 * of migration 0001's `owner_files`. `owner_files` already models a
 * different, larger entity (an owner/client's file, with `full_name` and
 * `phone_number` required — the property owner's own contact identity, not
 * the agent's). This feature's Property record is simpler: a property
 * managed by an app user (`owner_id` references `users`, the agent), with
 * no client-contact fields collected yet. Retrofitting `owner_files` would
 * either force a UI to collect owner-contact info nobody asked for this
 * phase, or weaken `owner_files`' existing NOT NULL contract — so this
 * stays a separate table until a later phase deliberately merges or
 * relates them.
 *
 * `property_type`/`transaction_type` stay unconstrained TEXT, matching
 * migration 0001's identical fields on `owner_files` — their allowed
 * values are still undecided project-wide, not a new gap introduced here.
 * `status` reuses the same `active`/`archived` convention already used by
 * `owner_files` and `applicant_files`.
 */
export const migration0002Properties: Migration = {
  version: 2,
  description: 'Property/file management feature',
  statements: [
    `CREATE TABLE properties (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      property_type TEXT,
      transaction_type TEXT,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      price REAL,
      area REAL,
      rooms INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_properties_owner ON properties(owner_id)`,
    `CREATE INDEX idx_properties_status ON properties(status)`,
    `CREATE INDEX idx_properties_city ON properties(city)`
  ]
}
