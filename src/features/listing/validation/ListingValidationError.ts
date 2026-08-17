import type { ListingFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class ListingValidationError extends Error {
  constructor(readonly fieldErrors: ListingFormErrors) {
    super('Listing form validation failed.')
    this.name = 'ListingValidationError'
  }
}
