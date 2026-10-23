import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import { findPropertyMatchesForApplicant } from '@features/matching/services/matchingService'
import { relativeDay } from '@shared/utils/shortMoney'
import type { DashboardData, DashboardFollowUp } from '../types'

const FOLLOW_UPS_LIMIT = 5

function endOfToday(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
}

function timeOfDay(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Home (v1.3.0 design batch 2) — every number is read live from the
 * local database: the four summary counts, today's follow-ups (overdue
 * ones first, as reminders are already soonest-first), and how many
 * applicants already have a suitable file (the existing matching engine
 * over active records only).
 */
export async function fetchDashboardData(
  ownerId: string,
  now: Date = new Date()
): Promise<DashboardData> {
  const db = await getDatabase()
  const propertyRepository = new PropertyRepository(db)
  const applicantRepository = new ApplicantRepository(db)
  const dealRepository = new DealRepository(db)
  const reminderRepository = new ReminderRepository(db)
  const contractRepository = new ContractRepository(db)

  const [
    propertyCount,
    applicantCount,
    activeDealCount,
    activeContractCount,
    properties,
    applicants,
    incompleteReminders
  ] = await Promise.all([
    propertyRepository.countByOwner(ownerId),
    applicantRepository.countByUser(ownerId),
    dealRepository.countActive(ownerId),
    contractRepository.countActive(ownerId),
    propertyRepository.findAllByOwner(ownerId),
    applicantRepository.getAll(ownerId),
    reminderRepository.getIncomplete(ownerId)
  ])

  const nowIso = now.toISOString()
  const todayEnd = endOfToday(now)
  const applicantsById = new Map(applicants.map((applicant) => [applicant.id, applicant]))
  const propertiesById = new Map(properties.map((property) => [property.id, property]))

  const followUps: DashboardFollowUp[] = incompleteReminders
    .filter((reminder) => reminder.remindAt < todayEnd)
    .slice(0, FOLLOW_UPS_LIMIT)
    .map((reminder) => {
      const applicant = reminder.applicantId ? applicantsById.get(reminder.applicantId) : undefined
      const property = reminder.propertyId ? propertiesById.get(reminder.propertyId) : undefined
      const subtitle = [applicant?.fullName, property?.title].filter(Boolean).join(' · ')
      const isToday = relativeDay(reminder.remindAt, now) === 'امروز'
      return {
        id: reminder.id,
        title: reminder.title,
        subtitle: subtitle || null,
        timeLabel: isToday ? timeOfDay(reminder.remindAt) : relativeDay(reminder.remindAt, now),
        isOverdue: reminder.remindAt < nowIso,
        phoneNumber: applicant?.phoneNumber ?? null
      }
    })

  const activeProperties = properties.filter((property) => property.status === 'active')
  let matchCount = 0
  let matchedApplicantCount = 0
  for (const applicant of applicants) {
    if (applicant.status !== 'active') {
      continue
    }
    const found = findPropertyMatchesForApplicant(applicant, activeProperties).length
    if (found > 0) {
      matchCount += found
      matchedApplicantCount += 1
    }
  }

  return {
    stats: [
      { id: 'properties', label: 'فایل ملکی', value: propertyCount },
      { id: 'applicants', label: 'متقاضی', value: applicantCount },
      { id: 'contracts', label: 'قرارداد فعال', value: activeContractCount },
      { id: 'deals', label: 'پیگیری باز', value: activeDealCount }
    ],
    followUps,
    hasOverdue: incompleteReminders.some((reminder) => reminder.remindAt < nowIso),
    matches: { matchCount, applicantCount: matchedApplicantCount }
  }
}
