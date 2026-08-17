import type { Migration } from '../types'

/**
 * `listings` — splits "this deal is for sale at 15B" out of `properties`
 * (crm-architecture-audit-v1.md §C.4). One property can have more than
 * one listing (e.g. re-listed for rent after a failed sale attempt).
 * `properties.property_type`/`transaction_type`/`price` stay in place
 * unchanged in this migration — an expand-only step; the service layer
 * that starts writing/reading `listings` instead is Phase 2, and the
 * old columns are dropped only once nothing reads them anymore.
 *
 * Pricing is nullable, direct columns (not a sub-table) per the
 * architecture doc's own default recommendation: `sale_total_price` for
 * `transaction_type='sale'`, `deposit`/`monthly_rent` for
 * `'rent'`/`'rent_and_deposit'` — enforcing "the right one is filled in"
 * is a Business Rule (BR, see the architecture doc §D), not a SQL CHECK,
 * since which combination is valid depends on `transaction_type`.
 */
export const migration0009Listings: Migration = {
  version: 9,
  description: 'Listing entity (transaction/pricing split out of Property)',
  statements: [
    `CREATE TABLE listings (
      id TEXT PRIMARY KEY NOT NULL,
      property_id TEXT NOT NULL REFERENCES properties(id),
      transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('sale', 'rent', 'rent_and_deposit')
      ),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'active', 'paused', 'closed')
      ),
      total_price REAL,
      deposit REAL,
      monthly_rent REAL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_listings_property ON listings(property_id)`,
    `CREATE INDEX idx_listings_status ON listings(status)`,
    `CREATE INDEX idx_listings_transaction_type ON listings(transaction_type)`
  ]
}
