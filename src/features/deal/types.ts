import type { DealRecord } from '@infrastructure/database/repositories/DealRepository'
import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'

export type {
  DealRecord as Deal,
  DealStatus
} from '@infrastructure/database/repositories/DealRepository'

export type DealWithDetails = DealRecord & {
  property: Property | null
  applicant: Applicant | null
}
