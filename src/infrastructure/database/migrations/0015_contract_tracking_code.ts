import type { Migration } from '../types'

/**
 * "کد رهگیری" — the tracking code Iran's official rental/sale contract
 * registration system (اجاره‌بها/ثبت معاملات املاک) issues once a
 * contract is registered there. Optional and free-text: not every
 * contract type requires one, and its format isn't validated here (the
 * issuing system, not this app, is the source of truth for what a valid
 * code looks like).
 */
export const migration0015ContractTrackingCode: Migration = {
  version: 15,
  description: 'Add tracking_code to contracts',
  statements: [`ALTER TABLE contracts ADD COLUMN tracking_code TEXT`]
}
