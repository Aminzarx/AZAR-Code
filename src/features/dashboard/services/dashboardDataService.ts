import { getDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import type { DashboardData } from '../types'

/**
 * Properties and applicants counts are both real now (queried via their
 * repositories). Contracts stays mocked at 0 and recent activity stays
 * empty — same deliberate mock-first pattern as `MockAuthApiClient`
 * (infrastructure/auth/mockAuthApiClient.ts) — because no contract feature
 * or repository exists yet. Replaced field by field as each feature lands.
 */
export async function fetchDashboardData(ownerId: string): Promise<DashboardData> {
  const db = await getDatabase()
  const propertyRepository = new PropertyRepository(db)
  const applicantRepository = new ApplicantRepository(db)
  const [propertyCount, applicantCount] = await Promise.all([
    propertyRepository.countByOwner(ownerId),
    applicantRepository.countByUser(ownerId)
  ])

  return {
    stats: [
      { id: 'properties', label: 'پرونده‌های ملکی', value: String(propertyCount) },
      { id: 'applicants', label: 'متقاضیان', value: String(applicantCount) },
      { id: 'contracts', label: 'قراردادهای فعال', value: '0' }
    ],
    recentActivity: []
  }
}
