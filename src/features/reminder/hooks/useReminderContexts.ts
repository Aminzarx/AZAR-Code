import { useMemo } from 'react'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { useDeals } from '@features/deal/hooks/useDeals'
import type { Reminder } from '../types'

export type ReminderContext = {
  primary: string
  secondary?: string
}

type UseReminderContextsResult = {
  isLoading: boolean
  resolve: (reminder: Reminder) => ReminderContext | null
}

/**
 * Bulk-resolves each row's linked property/applicant/deal name for the
 * Reminder List — one query per entity type for the whole screen (reusing
 * the existing list hooks, already scoped to this user) instead of one
 * query per row, in the spirit of design-system.md §6.5's N+1 avoidance
 * note (written for status, applies equally to context lookups here).
 */
export function useReminderContexts(userId: string): UseReminderContextsResult {
  const { properties, isLoading: propertiesLoading } = useProperties(userId, '')
  const { applicants, isLoading: applicantsLoading } = useApplicants(userId, '')
  const { deals, isLoading: dealsLoading } = useDeals(userId)

  const propertyById = useMemo(
    () => new Map((properties ?? []).map((property) => [property.id, property])),
    [properties]
  )
  const applicantById = useMemo(
    () => new Map((applicants ?? []).map((applicant) => [applicant.id, applicant])),
    [applicants]
  )
  const dealById = useMemo(() => new Map((deals ?? []).map((deal) => [deal.id, deal])), [deals])

  const resolve = useMemo(() => {
    return (reminder: Reminder): ReminderContext | null => {
      if (reminder.dealId) {
        const deal = dealById.get(reminder.dealId)
        if (deal) {
          return {
            primary: deal.property?.title ?? '',
            secondary: deal.applicant?.fullName
          }
        }
      }
      if (reminder.propertyId) {
        const property = propertyById.get(reminder.propertyId)
        if (property) {
          return { primary: property.title }
        }
      }
      if (reminder.applicantId) {
        const applicant = applicantById.get(reminder.applicantId)
        if (applicant) {
          return { primary: applicant.fullName }
        }
      }
      return null
    }
  }, [dealById, propertyById, applicantById])

  return {
    isLoading: propertiesLoading || applicantsLoading || dealsLoading,
    resolve
  }
}
