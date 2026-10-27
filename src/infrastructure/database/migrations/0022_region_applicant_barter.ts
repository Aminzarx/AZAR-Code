import type { Migration } from '../types'

/**
 * Amin #5416: a file and an applicant carry a «منطقه» (district) beside the city, on one row with it.
 * Amin #5408: an applicant who wants a barter names what they offer, the same categories as a barter file
 * (`barter_items` a JSON array of labels, `barter_other_description` the free text of «سایر»).
 * All NULL on existing rows; sync copies every column, so nothing else changes.
 */
export const migration0022RegionApplicantBarter: Migration = {
  version: 22,
  description: 'Add region to properties and applicants; barter items to applicants',
  statements: [
    `ALTER TABLE properties ADD COLUMN region TEXT`,
    `ALTER TABLE applicants ADD COLUMN region TEXT`,
    `ALTER TABLE applicants ADD COLUMN barter_items TEXT`,
    `ALTER TABLE applicants ADD COLUMN barter_other_description TEXT`
  ]
}
