import type { Migration } from '../types'
import { migration0001InitialSchema } from './0001_initial_schema'
import { migration0002Properties } from './0002_properties'
import { migration0003Applicants } from './0003_applicants'
import { migration0004Deals } from './0004_deals'
import { migration0005Reminders } from './0005_reminders'
import { migration0006Contracts } from './0006_contracts'
import { migration0007SeedBootstrapReferralUser } from './0007_seed_bootstrap_referral_user'

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
  migration0007SeedBootstrapReferralUser
]
