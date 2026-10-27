export type {
  PropertyRecord as Property,
  PropertyStatus
} from '@infrastructure/database/repositories/PropertyRepository'

export type PropertyFormValues = {
  title: string
  propertyType: string
  transactionType: string
  city: string
  /** Amin #5416: the district, beside the city */
  region?: string
  address: string
  price: string
  area: string
  rooms: string
  depositAmount: string
  rentAmount: string
  isConvertible: boolean
  barterItems: string[]
  barterOtherDescription: string
  description: string
  /**
   * Amin #5066: the owner, on a step of their own. All optional: nothing typed = no owner. Once anything is typed the
   * name and a mobile number are needed (the owner is kept as a contact with the «مالک» role, linked to the file).
   */
  ownerName?: string
  ownerPhone?: string
  ownerNotes?: string
}

export type PropertyFormErrors = Partial<Record<keyof PropertyFormValues, string>>
