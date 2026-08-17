import type { ContractFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class ContractValidationError extends Error {
  constructor(readonly fieldErrors: ContractFormErrors) {
    super('Contract form validation failed.')
    this.name = 'ContractValidationError'
  }
}
