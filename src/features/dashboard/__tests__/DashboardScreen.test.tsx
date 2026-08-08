import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DashboardScreen } from '../DashboardScreen'
import { fetchDashboardData } from '../services/mockDashboardService'

const mockLogout = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' },
    logout: mockLogout
  })
}))

jest.mock('../services/mockDashboardService')

const mockedFetchDashboardData = fetchDashboardData as jest.MockedFunction<
  typeof fetchDashboardData
>

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockedFetchDashboardData.mockReset()
    mockLogout.mockReset()
  })

  it('shows a loading indicator, then the referral code and stats once data resolves', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'پرونده‌های ملکی', value: '2' }],
      recentActivity: []
    })

    const { findByText } = await render(withTheme(<DashboardScreen />))

    expect(await findByText('کد معرف شما: ABCD1234')).toBeTruthy()
    expect(await findByText('پرونده‌های ملکی')).toBeTruthy()
  })

  it('shows an error state with retry when the fetch fails', async () => {
    mockedFetchDashboardData.mockRejectedValue(new Error('اتصال برقرار نشد'))

    const { findByText } = await render(withTheme(<DashboardScreen />))

    expect(await findByText('بارگذاری داشبورد با مشکل مواجه شد')).toBeTruthy()
    expect(await findByText('اتصال برقرار نشد')).toBeTruthy()
  })

  it('shows the empty state for recent activity when there is none', async () => {
    mockedFetchDashboardData.mockResolvedValue({ stats: [], recentActivity: [] })

    const { findByText } = await render(withTheme(<DashboardScreen />))

    expect(await findByText('هنوز فعالیتی ثبت نشده')).toBeTruthy()
  })
})
