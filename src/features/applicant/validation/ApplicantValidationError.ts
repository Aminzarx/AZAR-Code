import type { ApplicantFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class ApplicantValidationError extends Error {
  constructor(readonly fieldErrors: ApplicantFormErrors) {
    super('Applicant form validation failed.')
    this.name = 'ApplicantValidationError'
  }
}
