import type { Migration } from '../types'
import { triggersFor } from './0019_server_sync'

/**
 * Amin #5864: deleting a file or an applicant deletes its reminders, but its contracts stay. A contract no longer
 * holds the file or the applicant by a database link (that link blocked the delete); it keeps their ids, and
 * `property_label` / `applicant_label` keep their names as text, so the contract still reads right once they are gone.
 *
 * The working database is built fresh in memory on every start, so the table is still empty here: it is simply
 * made again (with every column it gained since 0006) and given back its indexes and server-sync triggers.
 */
export const migration0023ContractKeepsParties: Migration = {
  version: 23,
  description: 'Contracts outlive their file/applicant and keep their names',
  statements: [
    `DROP TABLE contracts`,
    `CREATE TABLE contracts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      property_id TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      deal_id TEXT REFERENCES deals(id),
      type TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      amount REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      buyer_contact_id TEXT REFERENCES contacts(id),
      seller_contact_id TEXT REFERENCES contacts(id),
      transaction_type TEXT,
      total_price REAL,
      deposit REAL,
      monthly_rent REAL,
      archived_at TEXT,
      tracking_code TEXT,
      calendar_event_id TEXT,
      property_label TEXT,
      applicant_label TEXT
    )`,
    `CREATE INDEX idx_contracts_user ON contracts(user_id)`,
    `CREATE INDEX idx_contracts_property ON contracts(property_id)`,
    `CREATE INDEX idx_contracts_applicant ON contracts(applicant_id)`,
    `CREATE INDEX idx_contracts_deal ON contracts(deal_id)`,
    `CREATE INDEX idx_contracts_status ON contracts(status)`,
    ...triggersFor('contracts', (r) => `${r}.id`)
  ]
}
