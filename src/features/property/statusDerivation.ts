import type { DealRecord } from '@infrastructure/database/repositories/DealRepository'
import type { StatusTone } from '@shared/theme/tokens'
import type { Property } from './types'

export type DerivedStatus = {
  label: string
  tone: StatusTone
}

/**
 * design-system.md §6.5 — list screens show only this cheap base status
 * (straight from the DB `status` column) to avoid an N+1 deal query per
 * row; the richer derived status below is Detail-screen-only.
 */
export function basePropertyStatus(status: Property['status']): DerivedStatus {
  return status === 'archived'
    ? { label: 'بایگانی', tone: 'neutral' }
    : { label: 'فعال', tone: 'positive' }
}

/**
 * design-system.md §6.5 — Property Detail's richer derived status:
 * archived → بایگانی; else a won-stage deal → معامله‌شده; else any
 * open-stage deal → در حال معامله; else فعال. Reuses
 * `DealRepository.getByProperty` (already-persisted data, no schema
 * change) — the caller passes the fetched deals in.
 */
export function derivePropertyStatus(property: Property, deals: DealRecord[]): DerivedStatus {
  if (property.status === 'archived') {
    return { label: 'بایگانی', tone: 'neutral' }
  }
  if (deals.some((deal) => deal.currentStage === 'won')) {
    return { label: 'معامله‌شده', tone: 'highlight' }
  }
  if (deals.some((deal) => deal.currentStage !== 'won' && deal.currentStage !== 'lost')) {
    return { label: 'در حال معامله', tone: 'inProgress' }
  }
  return { label: 'فعال', tone: 'positive' }
}
