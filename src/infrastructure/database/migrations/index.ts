import type { Migration } from '../types'
import { migration0001InitialSchema } from './0001_initial_schema'
import { migration0002Properties } from './0002_properties'
import { migration0003Applicants } from './0003_applicants'
import { migration0004Deals } from './0004_deals'
import { migration0005Reminders } from './0005_reminders'
import { migration0006Contracts } from './0006_contracts'
import { migration0007SeedBootstrapReferralUser } from './0007_seed_bootstrap_referral_user'
import { migration0008Contacts } from './0008_contacts'
import { migration0009Listings } from './0009_listings'
import { migration0010DealPipeline } from './0010_deal_pipeline'
import { migration0011ActivityAndAuditLog } from './0011_activity_and_audit_log'
import { migration0012ReminderAndContractExpansion } from './0012_reminder_and_contract_expansion'
import { migration0013PropertyOwnerContact } from './0013_property_owner_contact'
import { migration0014RentMortgageFields } from './0014_rent_mortgage_fields'

/**
 * Ordered by version, ascending — docs/architecture/migration-strategy.md
 * requires monotonic, sequential, never-reused version numbers.
 */
export const migrations: readonly Migration[] = [
  migration0001InitialSchema,
  migration0002Properties,
  migration0003Applicants,
  migration0004Deals,
  migration0005Reminders,
  migration0006Contracts,
  migration0007SeedBootstrapReferralUser,
  migration0008Contacts,
  migration0009Listings,
  migration0010DealPipeline,
  migration0011ActivityAndAuditLog,
  migration0012ReminderAndContractExpansion,
  migration0013PropertyOwnerContact,
  migration0014RentMortgageFields
]
