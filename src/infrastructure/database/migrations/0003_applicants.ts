import type { Migration } from '../types'

/**
 * `applicants` is a new, standalone table — same reasoning as migration
 * 0002's `properties` versus `owner_files`. A pre-existing `applicant_files`
 * table (migration 0001) already models a related but different entity:
 * contact/identity fields plus a structured `requirement_criteria`
 * preference set, built for the future matching engine. This feature's
 * Applicant record is simpler — flat budget/area/room preference fields
 * directly on the row, no criterion modeling — so it stays a separate
 * table rather than retrofitting `applicant_files` (whose `full_name`/
 * `phone_number` NOT NULL contract and criterion-based preference model
 * this simpler CRUD screen doesn't match).
 *
 * `applicant_type`/`preferred_transaction_type`/`preferred_property_type`
 * stay unconstrained TEXT, matching migration 0002's identical treatment
 * of `property_type`/`transaction_type` — no enum values are decided
 * project-wide yet. `status` reuses the existing `active`/`archived`
 * convention.
 */
export const migration0003Applicants: Migration = {
  version: 3,
  description: 'Applicant management feature',
  statements: [
    `CREATE TABLE applicants (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      applicant_type TEXT,
      preferred_transaction_type TEXT,
      preferred_property_type TEXT,
      city TEXT NOT NULL,
      min_budget REAL,
      max_budget REAL,
      min_area REAL,
      max_area REAL,
      rooms INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_applicants_user ON applicants(user_id)`,
    `CREATE INDEX idx_applicants_status ON applicants(status)`,
    `CREATE INDEX idx_applicants_city ON applicants(city)`
  ]
}
