import type { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import type { DealStatus } from '@infrastructure/database/repositories/DealRepository'
import type { PropertyService } from '@features/property/services/PropertyService'
import type { ApplicantService } from '@features/applicant/services/ApplicantService'
import type { Deal, DealWithDetails } from '../types'
import { normalizeDealNotes } from '../validation/dealValidation'

/**
 * Thin business-rule wrapper around DealRepository, same shape as
 * PropertyService/ApplicantService — plus enrichment with the related
 * property/applicant records (reusing their existing services rather than
 * duplicating lookups) since a deal row itself only stores foreign keys.
 */
export class DealService {
  constructor(
    private readonly repository: DealRepository,
    private readonly propertyService: PropertyService,
    private readonly applicantService: ApplicantService,
    private readonly generateId: () => string
  ) {}

  async createDeal(userId: string, propertyId: string, applicantId: string): Promise<Deal> {
    return this.repository.create({ id: this.generateId(), userId, propertyId, applicantId })
  }

  async listDeals(userId: string): Promise<DealWithDetails[]> {
    const deals = await this.repository.getAll(userId)
    return Promise.all(deals.map((deal) => this.attachDetails(deal)))
  }

  async getDeal(id: string): Promise<DealWithDetails | null> {
    const deal = await this.repository.getById(id)
    return deal ? this.attachDetails(deal) : null
  }

  async updateStatus(id: string, status: DealStatus): Promise<Deal> {
    return this.repository.updateStatus(id, status)
  }

  async updateNotes(id: string, notes: string): Promise<Deal> {
    return this.repository.updateNotes(id, normalizeDealNotes(notes))
  }

  async deleteDeal(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  async countActiveDeals(userId: string): Promise<number> {
    return this.repository.countActive(userId)
  }

  private async attachDetails(deal: Deal): Promise<DealWithDetails> {
    const [property, applicant] = await Promise.all([
      this.propertyService.getProperty(deal.propertyId),
      this.applicantService.getApplicant(deal.applicantId)
    ])
    return { ...deal, property, applicant }
  }
}
