import type { Migration } from '../types'

/**
 * "رهن" (mortgage/deposit) and "اجاره" (rent) are two independent amounts
 * of the same deal, not a single price — a listing can be deposit-only
 * ("رهن کامل", rent_amount = 0), rent-only ("فقط اجاره", deposit_amount =
 * 0), or a genuine mix of both, and a landlord may additionally be willing
 * to convert between the two. Added to both properties (what's on offer)
 * and applicants (what they're looking for), mirroring the existing
 * min/max budget columns' nullable, independently-optional shape — every
 * existing row is valid with these left NULL/0.
 */
export const migration0014RentMortgageFields: Migration = {
  version: 14,
  description: 'Add deposit/rent amounts and convertibility flag to properties and applicants',
  statements: [
    `ALTER TABLE properties ADD COLUMN deposit_amount REAL`,
    `ALTER TABLE properties ADD COLUMN rent_amount REAL`,
    `ALTER TABLE properties ADD COLUMN is_convertible INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE applicants ADD COLUMN deposit_amount REAL`,
    `ALTER TABLE applicants ADD COLUMN rent_amount REAL`,
    `ALTER TABLE applicants ADD COLUMN is_convertible INTEGER NOT NULL DEFAULT 0`
  ]
}
