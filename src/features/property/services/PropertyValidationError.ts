import type { PropertyFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class PropertyValidationError extends Error {
  constructor(readonly fieldErrors: PropertyFormErrors) {
    super('Property form validation failed.')
    this.name = 'PropertyValidationError'
  }
}
