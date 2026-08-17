import type { Migration } from '../types'

/**
 * Two additive expansions from crm-architecture-audit-v1.md, bundled
 * because both are small nullable-column additions to existing tables:
 *
 * - `reminders.contact_id` — §C.11: reminders can now attach to a
 *   Contact, not just Property/Applicant/Deal. `reminders.contract_id`
 *   was already implicitly reachable via `deal_id`, but the brief's §14
 *   asks for a direct link too, so it's added explicitly.
 * - `contracts.*` — §C.13: `buyer_contact_id`/`seller_contact_id` (the
 *   actual parties, BR-005), `transaction_type` + `total_price`/
 *   `deposit`/`monthly_rent` (sale vs. rent pricing, mirroring
 *   `listings`), and `archived_at` (soft delete, BR-007, replacing the
 *   repository's current real `DELETE`).
 *
 * `contracts.amount` (the existing generic field) and the repository's
 * current hard-delete behavior are both left untouched here — switching
 * writers/readers to the new columns and to soft-delete is Phase 2/3,
 * not a schema-only step.
 */
export const migration0012ReminderAndContractExpansion: Migration = {
  version: 12,
  description: 'Reminder Contact link + Contract parties/pricing/archive columns',
  statements: [
    `ALTER TABLE reminders ADD COLUMN contact_id TEXT REFERENCES contacts(id)`,
    `ALTER TABLE reminders ADD COLUMN contract_id TEXT REFERENCES contracts(id)`,
    `CREATE INDEX idx_reminders_contact ON reminders(contact_id)`,
    `CREATE INDEX idx_reminders_contract ON reminders(contract_id)`,

    `ALTER TABLE contracts ADD COLUMN buyer_contact_id TEXT REFERENCES contacts(id)`,
    `ALTER TABLE contracts ADD COLUMN seller_contact_id TEXT REFERENCES contacts(id)`,
    `ALTER TABLE contracts ADD COLUMN transaction_type TEXT`,
    `ALTER TABLE contracts ADD COLUMN total_price REAL`,
    `ALTER TABLE contracts ADD COLUMN deposit REAL`,
    `ALTER TABLE contracts ADD COLUMN monthly_rent REAL`,
    `ALTER TABLE contracts ADD COLUMN archived_at TEXT`
  ]
}
