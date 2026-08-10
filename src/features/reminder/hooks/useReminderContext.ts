import { useEffect, useState } from 'react'
import { usePropertyService } from '@features/property/hooks/usePropertyService'
import { useApplicantService } from '@features/applicant/hooks/useApplicantService'
import { useDealService } from '@features/deal/hooks/useDealService'
import type { Reminder } from '../types'
import type { ReminderContext } from './useReminderContexts'

/**
 * Resolves a single reminder's linked property/applicant/deal for Detail's
 * `ContextHeader` — a deal-linked reminder shows property as primary and
 * applicant as secondary; a property- or applicant-only reminder shows just
 * that one entity. One-record lookup, so (unlike the list's bulk
 * `useReminderContexts`) going straight through the services is fine here.
 */
export function useReminderContext(reminder: Reminder | null): ReminderContext | null {
  const propertyService = usePropertyService()
  const applicantService = useApplicantService()
  const dealService = useDealService()
  const [context, setContext] = useState<ReminderContext | null>(null)

  useEffect(() => {
    if (!reminder) {
      setContext(null)
      return
    }
    const current = reminder
    let cancelled = false

    async function resolve(): Promise<void> {
      if (current.dealId && dealService) {
        const deal = await dealService.getDeal(current.dealId)
        if (cancelled) {
          return
        }
        if (deal) {
          setContext({ primary: deal.property?.title ?? '', secondary: deal.applicant?.fullName })
          return
        }
      }
      if (current.propertyId && propertyService) {
        const property = await propertyService.getProperty(current.propertyId)
        if (cancelled) {
          return
        }
        if (property) {
          setContext({ primary: property.title })
          return
        }
      }
      if (current.applicantId && applicantService) {
        const applicant = await applicantService.getApplicant(current.applicantId)
        if (cancelled) {
          return
        }
        if (applicant) {
          setContext({ primary: applicant.fullName })
          return
        }
      }
      if (!cancelled) {
        setContext(null)
      }
    }

    resolve()

    return () => {
      cancelled = true
    }
  }, [reminder, propertyService, applicantService, dealService])

  return context
}
