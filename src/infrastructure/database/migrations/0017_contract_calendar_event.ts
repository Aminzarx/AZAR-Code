import type { Migration } from '../types'

/**
 * The id of the reminder event this contract's end-date reminder was
 * saved as in the phone's own native calendar (react-native-calendar-
 * events), so it can be found again and deleted if the contract is
 * deleted or its reminder offset is changed. Null when no calendar
 * reminder was requested for this contract.
 */
export const migration0017ContractCalendarEvent: Migration = {
  version: 17,
  description: 'Add calendar_event_id to contracts',
  statements: [`ALTER TABLE contracts ADD COLUMN calendar_event_id TEXT`]
}
