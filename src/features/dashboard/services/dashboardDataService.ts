import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { DealService } from '@features/deal/services/DealService'
import { generateId } from '@infrastructure/auth/idGenerators'
import { DEAL_STATUS_LABELS } from '@features/deal/dealStatusLabels'
import type { DashboardActivity, DashboardData } from '../types'

const RECENT_ACTIVITY_LIMIT = 5
const RECENT_ITEMS_PER_SOURCE = RECENT_ACTIVITY_LIMIT

function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('fa-IR')
}

/**
 * Every stat and every activity entry is read live from the database —
 * no mock data remains. Recent activity merges the most recently created
 * property/applicant/deal rows (each source already sorted newest-first
 * by its repository) and re-sorts the combined set by timestamp.
 */
export async function fetchDashboardData(ownerId: string): Promise<DashboardData> {
  const db = await getDatabase()
  const propertyRepository = new PropertyRepository(db)
  const applicantRepository = new ApplicantRepository(db)
  const dealRepository = new DealRepository(db)
  const dealService = new DealService(
    dealRepository,
    new PropertyService(propertyRepository, generateId),
    new ApplicantService(applicantRepository, generateId),
    generateId
  )

  const [
    propertyCount,
    applicantCount,
    activeDealCount,
    recentProperties,
    recentApplicants,
    recentDeals
  ] = await Promise.all([
    propertyRepository.countByOwner(ownerId),
    applicantRepository.countByUser(ownerId),
    dealRepository.countActive(ownerId),
    propertyRepository.findAllByOwner(ownerId),
    applicantRepository.getAll(ownerId),
    dealService.listDeals(ownerId)
  ])

  const activity: DashboardActivity[] = [
    ...recentProperties.slice(0, RECENT_ITEMS_PER_SOURCE).map((property) => ({
      id: `property-${property.id}`,
      title: `پرونده ملکی جدید: ${property.title}`,
      description: `${property.city} — ${property.address}`,
      timestamp: formatDate(property.createdAt),
      createdAt: property.createdAt
    })),
    ...recentApplicants.slice(0, RECENT_ITEMS_PER_SOURCE).map((applicant) => ({
      id: `applicant-${applicant.id}`,
      title: `متقاضی جدید: ${applicant.fullName}`,
      description: applicant.city,
      timestamp: formatDate(applicant.createdAt),
      createdAt: applicant.createdAt
    })),
    ...recentDeals.slice(0, RECENT_ITEMS_PER_SOURCE).map((deal) => ({
      id: `deal-${deal.id}`,
      title: `پیگیری جدید: ${deal.property?.title ?? 'ملک نامشخص'}`,
      description: `${deal.applicant?.fullName ?? 'متقاضی نامشخص'} — ${DEAL_STATUS_LABELS[deal.status]}`,
      timestamp: formatDate(deal.createdAt),
      createdAt: deal.createdAt
    }))
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(({ id, title, description, timestamp }) => ({ id, title, description, timestamp }))

  return {
    stats: [
      { id: 'properties', label: 'پرونده‌های ملکی', value: String(propertyCount) },
      { id: 'applicants', label: 'متقاضیان', value: String(applicantCount) },
      { id: 'contracts', label: 'پیگیری‌های فعال', value: String(activeDealCount) }
    ],
    recentActivity: activity
  }
}
