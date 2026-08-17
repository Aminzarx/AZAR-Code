import type { Migration } from '../types'

/**
 * `deals` tracks the relationship/pipeline between one property and one
 * applicant, before any real Contract exists (Contract itself stays
 * deferred — see migration 0001's header, unchanged by this feature).
 * `status` is a fixed, product-specified set (not an open decision this
 * phase) — enforced with the same CHECK-constraint convention already
 * used for `requirement_criteria.priority`, `owner_files.status`, etc.
 */
export const migration0004Deals: Migration = {
  version: 4,
  description: 'Deal tracking feature (property/applicant pipeline)',
  statements: [
    `CREATE TABLE deals (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      applicant_id TEXT NOT NULL REFERENCES applicants(id),
      status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'contacted', 'viewing', 'negotiating', 'completed', 'cancelled')
      ),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_deals_user ON deals(user_id)`,
    `CREATE INDEX idx_deals_property ON deals(property_id)`,
    `CREATE INDEX idx_deals_applicant ON deals(applicant_id)`,
    `CREATE INDEX idx_deals_status ON deals(status)`
  ]
}
