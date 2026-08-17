import type { Migration } from '../types'

/**
 * `contacts` — the person-level entity docs/architecture/
 * crm-architecture-audit-v1.md §C.2 introduces: one real person (owner,
 * buyer, tenant, seller, landlord, agent, collaborator, referrer) who can
 * hold more than one role at once, instead of `applicants` doubling as
 * the only human record in the system. `contact_roles` is a separate
 * table (not a single TEXT column) specifically so one contact can carry
 * several roles simultaneously — the whole point of this entity per the
 * architecture doc's example ("Owner + Seller" on one person).
 *
 * Additive only: existing `applicants`/`properties` tables and the code
 * reading them are untouched by this migration. Applicant->Contact data
 * migration and the `properties.owner_id` rename are later, separate
 * steps (Phase 2+), not bundled into this schema change.
 */
export const migration0008Contacts: Migration = {
  version: 8,
  description: 'Contact + ContactRole (multi-role person entity)',
  statements: [
    `CREATE TABLE contacts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_contacts_user ON contacts(user_id)`,
    `CREATE INDEX idx_contacts_phone ON contacts(phone_number)`,

    `CREATE TABLE contact_roles (
      id TEXT PRIMARY KEY NOT NULL,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (
        role IN ('owner', 'buyer', 'tenant', 'seller', 'landlord', 'agent', 'collaborator', 'referrer')
      ),
      created_at TEXT NOT NULL,
      UNIQUE (contact_id, role)
    )`,
    `CREATE INDEX idx_contact_roles_contact ON contact_roles(contact_id)`,
    `CREATE INDEX idx_contact_roles_role ON contact_roles(role)`
  ]
}
