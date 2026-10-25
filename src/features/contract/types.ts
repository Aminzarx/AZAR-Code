import type { ContractRecord } from '@infrastructure/database/repositories/ContractRepository'
import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'

export type {
  ContractRecord as Contract,
  ContractStatus
} from '@infrastructure/database/repositories/ContractRepository'

export type ContractWithDetails = ContractRecord & {
  property: Property | null
  applicant: Applicant | null
}

/** Amin #5295 (corrects #5240): a contract is for خرید و فروش, رهن و اجاره or تهاتر; only رهن و اجاره gets reminders */
export const CONTRACT_KINDS = ['خرید و فروش', 'رهن و اجاره', 'تهاتر'] as const
export const RENT_CONTRACT = 'رهن و اجاره'
export const hasRenewalReminder = (type: string | null | undefined): boolean => (type ?? '').trim() === RENT_CONTRACT

export type ContractFormValues = {
  type: string
  amount: string
  startDate: string
  endDate: string
  notes: string
  trackingCode: string
}

export type ContractFormErrors = Partial<Record<keyof ContractFormValues, string>>
