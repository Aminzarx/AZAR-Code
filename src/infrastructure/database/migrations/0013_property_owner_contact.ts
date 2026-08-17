import type { Migration } from '../types'

/**
 * `properties.owner_contact_id` — crm-architecture-audit-v1.md §A.2.2:
 * `properties.owner_id` is actually the CRM user (agent) managing the
 * listing, not the real owner of the property; that column keeps its
 * current meaning and every existing caller unchanged. This adds the
 * *actual* owner-of-the-property link, pointing at `contacts` (a
 * contact with the `owner` role) — nullable so existing rows (which
 * have no owner Contact yet) remain valid; backfilling it for existing
 * properties and wiring the create/edit form to set it are Phase 2/6.
 */
export const migration0013PropertyOwnerContact: Migration = {
  version: 13,
  description: 'Property -> owning Contact link',
  statements: [
    `ALTER TABLE properties ADD COLUMN owner_contact_id TEXT REFERENCES contacts(id)`,
    `CREATE INDEX idx_properties_owner_contact ON properties(owner_contact_id)`
  ]
}
