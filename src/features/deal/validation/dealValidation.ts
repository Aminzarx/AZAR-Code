import {
  DEAL_STATUSES,
  type DealStatus
} from '@infrastructure/database/repositories/DealRepository'

export function isValidDealStatus(value: string): value is DealStatus {
  return (DEAL_STATUSES as readonly string[]).includes(value)
}

/** Notes are optional free text — trims to null when empty, otherwise passes through unchanged. */
export function normalizeDealNotes(notes: string): string | null {
  const trimmed = notes.trim()
  return trimmed.length > 0 ? trimmed : null
}
