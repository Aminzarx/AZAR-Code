import type { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import type { DealStatus, DealStage } from '@infrastructure/database/repositories/DealRepository'
import type { PropertyService } from '@features/property/services/PropertyService'
import type { ApplicantService } from '@features/applicant/services/ApplicantService'
import type { Deal, DealStageHistory, DealWithDetails } from '../types'
import { normalizeDealNotes } from '../validation/dealValidation'

/** BR-004 — a deal cannot become 'lost' without a lost reason. */
export class DealStageTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DealStageTransitionError'
  }
}

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

  /** BR-004 — `lostReasonId` is required when `toStage === 'lost'`, and ignored otherwise. */
  async transitionStage(
    id: string,
    toStage: DealStage,
    actorUserId: string,
    options?: { note?: string; lostReasonId?: string }
  ): Promise<Deal> {
    if (toStage === 'lost' && !options?.lostReasonId) {
      throw new DealStageTransitionError('A lost deal requires a lost reason (BR-004).')
    }
    return this.repository.transitionStage(id, toStage, actorUserId, options)
  }

  async getStageHistory(dealId: string): Promise<DealStageHistory[]> {
    return this.repository.getStageHistory(dealId)
  }

  async updateExpectedValue(id: string, expectedValue: number | null): Promise<Deal> {
    return this.repository.updateExpectedValue(id, expectedValue)
  }

  async countDealsByStage(userId: string): Promise<Record<DealStage, number>> {
    return this.repository.countByStage(userId)
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
