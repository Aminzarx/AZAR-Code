import type { ListingRepository } from '@infrastructure/database/repositories/ListingRepository'
import type { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import type { Listing, ListingFormValues, ListingStatus } from '../types'
import { validateListingForm } from '../validation/listingValidation'
import { ListingValidationError } from '../validation/ListingValidationError'

/** Thin business-rule wrapper around ListingRepository — the UI never calls the repository directly. */
export class ListingService {
  constructor(
    private readonly repository: ListingRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly generateId: () => string
  ) {}

  async createListing(
    propertyId: string,
    userId: string,
    values: ListingFormValues
  ): Promise<Listing> {
    const { input, errors } = validateListingForm(values)
    if (!input) {
      throw new ListingValidationError(errors)
    }
    return this.repository.create({
      id: this.generateId(),
      propertyId,
      createdBy: userId,
      ...input
    })
  }

  async updateListing(
    id: string,
    status: ListingStatus,
    values: ListingFormValues
  ): Promise<Listing> {
    const { input, errors } = validateListingForm(values)
    if (!input) {
      throw new ListingValidationError(errors)
    }
    return this.repository.update(id, { ...input, status })
  }

  /**
   * BR-008 — a listing cannot become 'active' if its Property is
   * archived. Every other status transition (draft/paused/closed) has
   * no such restriction.
   */
  async setStatus(id: string, status: ListingStatus): Promise<Listing> {
    const listing = await this.repository.getById(id)
    if (!listing) {
      throw new Error(`Listing ${id} not found`)
    }
    if (status === 'active') {
      const property = await this.propertyRepository.findById(listing.propertyId)
      if (property?.status === 'archived') {
        throw new Error('Cannot activate a listing for an archived property.')
      }
    }
    return this.repository.update(id, {
      transactionType: listing.transactionType,
      status,
      totalPrice: listing.totalPrice,
      deposit: listing.deposit,
      monthlyRent: listing.monthlyRent
    })
  }

  async listByProperty(propertyId: string): Promise<Listing[]> {
    return this.repository.getByProperty(propertyId)
  }

  async listAllActiveForUser(userId: string): Promise<Listing[]> {
    return this.repository.getAllActiveForUser(userId)
  }

  async getListing(id: string): Promise<Listing | null> {
    return this.repository.getById(id)
  }

  async deleteListing(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
