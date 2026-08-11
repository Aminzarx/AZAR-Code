export type {
  PropertyRecord as Property,
  PropertyStatus
} from '@infrastructure/database/repositories/PropertyRepository'

export type PropertyFormValues = {
  title: string
  propertyType: string
  transactionType: string
  city: string
  address: string
  price: string
  area: string
  rooms: string
  depositAmount: string
  rentAmount: string
  isConvertible: boolean
  description: string
}

export type PropertyFormErrors = Partial<Record<keyof PropertyFormValues, string>>
