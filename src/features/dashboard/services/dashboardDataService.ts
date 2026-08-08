import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import type { DashboardData } from '../types'

/**
 * Properties count is real (queried via PropertyRepository, now that the
 * Property feature exists). Applicants/contracts stay mocked at 0 and
 * recent activity stays empty — same deliberate mock-first pattern as
 * `MockAuthApiClient` (infrastructure/auth/mockAuthApiClient.ts) — because
 * no applicant/contract feature or repository exists yet. Replaced field by
 * field as each feature lands, not all at once.
 */
export async function fetchDashboardData(ownerId: string): Promise<DashboardData> {
  const db = await getDatabase()
  const propertyRepository = new PropertyRepository(db)
  const propertyCount = await propertyRepository.countByOwner(ownerId)

  return {
    stats: [
      { id: 'properties', label: 'پرونده‌های ملکی', value: String(propertyCount) },
      { id: 'applicants', label: 'متقاضیان', value: '0' },
      { id: 'contracts', label: 'قراردادهای فعال', value: '0' }
    ],
    recentActivity: []
  }
}
