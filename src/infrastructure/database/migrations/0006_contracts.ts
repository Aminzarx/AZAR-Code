import type { Migration } from '../types'

/**
 * A separate, simpler concept from the conceptual `Contract` entity
 * described in docs/database/conceptual-data-model.md, whose `tenant`
 * relationship shape (ApplicantFile-backed vs. minimal record) is still
 * explicitly [OPEN-ARCH] — that question stays unresolved, unblocked by
 * this table. This MVP `contracts` table sidesteps it entirely by linking
 * directly to the already-real `applicants`/`properties` tables (not the
 * conceptual model's `owner_files`/`applicant_files`), same standalone-
 * table precedent as migrations 0002-0005. `type` stays unconstrained
 * TEXT for the same reason `property_type`/`transaction_type` do — no
 * enum values are decided project-wide yet. `status` is a minimal,
 * genuinely-needed lifecycle (`active`/`completed`/`cancelled`) — a
 * contract created from a Deal is ready to govern a real occupancy/sale,
 * so it starts `active` rather than needing a draft state (Deal's own
 * new/contacted/viewing/negotiating stages already cover pre-contract
 * negotiation).
 */
export const migration0006Contracts: Migration = {
  version: 6,
  description: 'Contract management feature',
  statements: [
    `CREATE TABLE contracts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      applicant_id TEXT NOT NULL REFERENCES applicants(id),
      deal_id TEXT REFERENCES deals(id),
      type TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      amount REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_contracts_user ON contracts(user_id)`,
    `CREATE INDEX idx_contracts_property ON contracts(property_id)`,
    `CREATE INDEX idx_contracts_applicant ON contracts(applicant_id)`,
    `CREATE INDEX idx_contracts_deal ON contracts(deal_id)`,
    `CREATE INDEX idx_contracts_status ON contracts(status)`
  ]
}
