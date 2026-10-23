import type { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import type { DealStatus, DealStage } from '@infrastructure/database/repositories/DealRepository'
import type { PropertyService } from '@features/property/services/PropertyService'
import type { ApplicantService } from '@features/applicant/services/ApplicantService'
import type { Deal, DealStageHistory, DealWithDetails } from '../types'
import { normalizeDealNotes } from '../validation/dealValidation'
import { DEAL_STAGES } from '../types'

const isOpen = (deal: Deal): boolean => deal.currentStage !== 'won' && deal.currentStage !== 'lost'

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

  /**
   * v1.4.0 (Amin #4321: one property + applicant showed as three deals): «ایجاد پیگیری» on a pair that already has an
   * open deal opens that deal instead of starting another one. A won or lost deal does not count, so a pair can start over.
   */
  async createDeal(userId: string, propertyId: string, applicantId: string): Promise<Deal> {
    const open = (await this.repository.getAll(userId)).find(
      (deal) => deal.propertyId === propertyId && deal.applicantId === applicantId && isOpen(deal)
    )
    if (open) {
      return open
    }
    return this.repository.create({ id: this.generateId(), userId, propertyId, applicantId })
  }

  async listDeals(userId: string): Promise<DealWithDetails[]> {
    const deals = await this.removeEmptyDuplicates(await this.repository.getAll(userId))
    return Promise.all(deals.map((deal) => this.attachDetails(deal)))
  }

  /**
   * v1.4.0: the copies made before createDeal checked for an open deal. Of the open deals on one pair the one worked on
   * furthest (then the oldest) stays; another copy goes only while nothing was ever done on it (still «جدید», no note,
   * no expected value, no stage move, reminder or contract), so nothing the user entered is lost.
   */
  private async removeEmptyDuplicates(deals: Deal[]): Promise<Deal[]> {
    const byPair = new Map<string, Deal[]>()
    for (const deal of deals.filter(isOpen)) {
      const key = `${deal.propertyId}:${deal.applicantId}`
      byPair.set(key, [...(byPair.get(key) ?? []), deal])
    }
    const removed = new Set<string>()
    for (const group of byPair.values()) {
      if (group.length < 2) {
        continue
      }
      const [keep] = [...group].sort(
        (a, b) => DEAL_STAGES.indexOf(b.currentStage) - DEAL_STAGES.indexOf(a.currentStage) || a.createdAt.localeCompare(b.createdAt)
      )
      for (const deal of group) {
        if (deal.id === keep.id || deal.currentStage !== 'new' || deal.notes || deal.expectedValue !== null) {
          continue
        }
        if (await this.repository.hasActivity(deal.id)) {
          continue
        }
        await this.repository.delete(deal.id)
        removed.add(deal.id)
      }
    }
    return removed.size ? deals.filter((deal) => !removed.has(deal.id)) : deals
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
