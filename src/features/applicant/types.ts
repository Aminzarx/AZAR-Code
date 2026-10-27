export type {
  ApplicantRecord as Applicant,
  ApplicantStatus
} from '@infrastructure/database/repositories/ApplicantRepository'

export type ApplicantFormValues = {
  fullName: string
  phoneNumber: string
  preferredTransactionType: string
  preferredPropertyType: string
  city: string
  /** Amin #5416: the district, beside the city */
  region?: string
  /** Amin #5408: what a barter applicant offers, like a barter file */
  barterItems?: string[]
  barterOtherDescription?: string
  minBudget: string
  maxBudget: string
  minArea: string
  maxArea: string
  rooms: string
  depositAmount: string
  rentAmount: string
  isConvertible: boolean
  description: string
}

export type ApplicantFormErrors = Partial<Record<keyof ApplicantFormValues, string>>
