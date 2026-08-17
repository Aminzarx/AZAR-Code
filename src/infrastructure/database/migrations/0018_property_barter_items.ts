import type { Migration } from '../types'

/**
 * تهاتر (barter) transactions need to record WHAT is being offered in
 * exchange — a small fixed set of common categories (طلا/خودرو/زمین/ملک)
 * plus a free-text "سایر" (other) fallback, not a single free-text field,
 * so the common cases stay structured/filterable while still allowing an
 * arbitrary item. `barter_items` stores a JSON array of the selected
 * category labels (e.g. '["طلا","خودرو"]'); `barter_other_description`
 * only has meaning when "سایر" is one of the selected items. Both NULL
 * for every existing row and for any non-تهاتر property — this only
 * applies when transaction_type is تهاتر.
 */
export const migration0018PropertyBarterItems: Migration = {
  version: 18,
  description: 'Add barter_items and barter_other_description to properties',
  statements: [
    `ALTER TABLE properties ADD COLUMN barter_items TEXT`,
    `ALTER TABLE properties ADD COLUMN barter_other_description TEXT`
  ]
}
