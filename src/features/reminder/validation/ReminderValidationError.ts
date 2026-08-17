import type { ReminderFormErrors } from '../types'

/** Distinct from a repository/DB failure — the input itself was rejected, per field. */
export class ReminderValidationError extends Error {
  constructor(readonly fieldErrors: ReminderFormErrors) {
    super('Reminder form validation failed.')
    this.name = 'ReminderValidationError'
  }
}
