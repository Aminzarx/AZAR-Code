import type { Migration } from '../types'

/**
 * Distinguishes a "بازدید" (site visit) reminder from a general
 * follow-up/call reminder — needed so completing a visit reminder can
 * automatically advance its linked deal's pipeline stage
 * (ReminderService.setDone), which nothing could key off of before this
 * (every reminder looked the same regardless of what it actually was).
 * Nullable/defaulted so every existing reminder row is still valid.
 */
export const migration0016ReminderType: Migration = {
  version: 16,
  description: 'Add reminder_type to reminders',
  statements: [
    `ALTER TABLE reminders ADD COLUMN reminder_type TEXT NOT NULL DEFAULT 'general' CHECK (reminder_type IN ('general', 'call', 'visit'))`
  ]
}
