import type { Migration } from '../types'

/**
 * A separate, simpler concept from the future Contract-tied `Reminder`
 * described in ADR-007-local-notifications.md (unique per
 * `(contract_id, offset)`, auto-generated from a reminder schedule).
 * Contract doesn't exist yet, so that system stays deferred, unchanged.
 * This `reminders` table is a general, user-created CRM reminder —
 * optionally linked to a property/applicant/deal — same standalone-table
 * precedent as migrations 0002-0004.
 *
 * `remind_at` is a single ISO-8601 datetime column rather than separate
 * date/time columns — one field is enough to represent "date and time"
 * and avoids parsing two related columns back into one instant.
 */
export const migration0005Reminders: Migration = {
  version: 5,
  description: 'Reminder management feature',
  statements: [
    `CREATE TABLE reminders (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      property_id TEXT REFERENCES properties(id),
      applicant_id TEXT REFERENCES applicants(id),
      deal_id TEXT REFERENCES deals(id),
      title TEXT NOT NULL,
      description TEXT,
      remind_at TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_reminders_user ON reminders(user_id)`,
    `CREATE INDEX idx_reminders_remind_at ON reminders(remind_at)`,
    `CREATE INDEX idx_reminders_is_done ON reminders(is_done)`,
    `CREATE INDEX idx_reminders_deal ON reminders(deal_id)`
  ]
}
