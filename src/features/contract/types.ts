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

export type ContractFormValues = {
  type: string
  amount: string
  startDate: string
  endDate: string
  notes: string
}

export type ContractFormErrors = Partial<Record<keyof ContractFormValues, string>>
