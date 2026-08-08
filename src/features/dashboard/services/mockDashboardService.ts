import type { DashboardData } from '../types'

/**
 * Stands in for a real dashboard read (property/applicant/contract counts,
 * recent activity feed) until those features and their repositories exist —
 * same deliberate mock-first pattern as `MockAuthApiClient`
 * (infrastructure/auth/mockAuthApiClient.ts). Replaced by a real
 * repository-backed query once files/matching/contracts land, not before.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return {
    stats: [
      { id: 'properties', label: 'پرونده‌های ملکی', value: '0' },
      { id: 'applicants', label: 'متقاضیان', value: '0' },
      { id: 'contracts', label: 'قراردادهای فعال', value: '0' }
    ],
    recentActivity: []
  }
}
