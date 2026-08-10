import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import { PropertyService } from '@features/property/services/PropertyService'
import { ApplicantService } from '@features/applicant/services/ApplicantService'
import { DealService } from '@features/deal/services/DealService'
import { generateId } from '@infrastructure/auth/idGenerators'
import { DEAL_STATUS_LABELS } from '@features/deal/dealStatusLabels'
import type { DashboardActivity, DashboardData, DashboardNeedsAttentionItem } from '../types'

const RECENT_ACTIVITY_LIMIT = 5
const RECENT_ITEMS_PER_SOURCE = RECENT_ACTIVITY_LIMIT
const UPCOMING_REMINDERS_LIMIT = 5

function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('fa-IR')
}

function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return `${date.toLocaleDateString('fa-IR')} • ${date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
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
  const reminderRepository = new ReminderRepository(db)
  const contractRepository = new ContractRepository(db)
  const dealService = new DealService(
    dealRepository,
    new PropertyService(propertyRepository, generateId),
    new ApplicantService(applicantRepository, generateId),
    generateId
  )

  const nowIso = new Date().toISOString()

  const [
    propertyCount,
    applicantCount,
    activeDealCount,
    activeContractCount,
    recentProperties,
    recentApplicants,
    recentDeals,
    upcomingReminders,
    incompleteReminders,
    dealCountsByStage
  ] = await Promise.all([
    propertyRepository.countByOwner(ownerId),
    applicantRepository.countByUser(ownerId),
    dealRepository.countActive(ownerId),
    contractRepository.countActive(ownerId),
    propertyRepository.findAllByOwner(ownerId),
    applicantRepository.getAll(ownerId),
    dealService.listDeals(ownerId),
    reminderRepository.getUpcoming(ownerId, nowIso),
    reminderRepository.getIncomplete(ownerId),
    dealRepository.countByStage(ownerId)
  ])

  // design-system.md §14 point 3 — "Needs Attention" only renders
  // categories genuinely backed by a real, already-existing read query.
  // A "ملک دارای متقاضی مناسب" (matching) category is deliberately
  // omitted here: computing it correctly would mean re-running the
  // matching engine, not reading an existing aggregate, which is out of
  // scope for a read-only dashboard query.
  const needsAttention: DashboardNeedsAttentionItem[] = []

  const overdueApplicantReminderCount = incompleteReminders.filter(
    (reminder) => reminder.applicantId !== null && reminder.remindAt < nowIso
  ).length
  if (overdueApplicantReminderCount > 0) {
    needsAttention.push({
      id: 'overdue-applicant-reminders',
      label: `${overdueApplicantReminderCount} متقاضی نیازمند پیگیری`,
      tone: 'attention',
      target: 'ApplicantList'
    })
  }

  // "contract" stage — a deal that has reached contract negotiation but
  // hasn't closed (won/lost) yet is the concrete "awaiting action" moment
  // this row represents; earlier pipeline stages are already surfaced by
  // the calmer "پیگیری‌های فعال" KPI above.
  const dealsAwaitingActionCount = dealCountsByStage.contract
  if (dealsAwaitingActionCount > 0) {
    needsAttention.push({
      id: 'deals-awaiting-action',
      label: `${dealsAwaitingActionCount} معامله در انتظار اقدام`,
      tone: 'inProgress',
      target: 'DealList'
    })
  }

  const activity: DashboardActivity[] = [
    ...recentProperties.slice(0, RECENT_ITEMS_PER_SOURCE).map((property) => ({
      id: `property-${property.id}`,
      title: `پرونده ملکی جدید: ${property.title}`,
      description: `${property.city} • ${property.address}`,
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
      description: `${deal.applicant?.fullName ?? 'متقاضی نامشخص'} • ${DEAL_STATUS_LABELS[deal.status]}`,
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
      { id: 'deals', label: 'پیگیری‌های فعال', value: String(activeDealCount) },
      { id: 'contracts', label: 'قراردادهای فعال', value: String(activeContractCount) }
    ],
    needsAttention,
    recentActivity: activity,
    upcomingReminders: upcomingReminders.slice(0, UPCOMING_REMINDERS_LIMIT).map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      timestamp: formatDateTime(reminder.remindAt)
    }))
  }
}
