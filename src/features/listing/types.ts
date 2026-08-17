export type {
  ListingRecord as Listing,
  ListingTransactionType,
  ListingStatus
} from '@infrastructure/database/repositories/ListingRepository'
export {
  LISTING_TRANSACTION_TYPES,
  LISTING_STATUSES
} from '@infrastructure/database/repositories/ListingRepository'

export type ListingFormValues = {
  transactionType: string
  totalPrice: string
  deposit: string
  monthlyRent: string
}

export type ListingFormErrors = Partial<Record<keyof ListingFormValues, string>>
