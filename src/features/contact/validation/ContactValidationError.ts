import type { ContactFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class ContactValidationError extends Error {
  constructor(readonly fieldErrors: ContactFormErrors) {
    super('Contact form validation failed.')
    this.name = 'ContactValidationError'
  }
}
