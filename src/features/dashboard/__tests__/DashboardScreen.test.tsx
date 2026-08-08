import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DashboardScreen } from '../DashboardScreen'
import { fetchDashboardData } from '../services/dashboardDataService'

const mockLogout = jest.fn()
const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' },
    logout: mockLogout
  })
}))

jest.mock('../services/dashboardDataService')

const mockedFetchDashboardData = fetchDashboardData as jest.MockedFunction<
  typeof fetchDashboardData
>

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'Home', name: 'Home' as const, params: undefined }

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockedFetchDashboardData.mockReset()
    mockLogout.mockReset()
    mockNavigate.mockReset()
  })

  it('shows a loading indicator, then the referral code and stats once data resolves', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'پرونده‌های ملکی', value: '2' }],
      recentActivity: []
    })

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('کد معرف شما: ABCD1234')).toBeTruthy()
    expect(await findByText('پرونده‌های ملکی')).toBeTruthy()
    expect(mockedFetchDashboardData).toHaveBeenCalledWith('u1')
  })

  it('shows an error state with retry when the fetch fails', async () => {
    mockedFetchDashboardData.mockRejectedValue(new Error('اتصال برقرار نشد'))

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری داشبورد با مشکل مواجه شد')).toBeTruthy()
    expect(await findByText('اتصال برقرار نشد')).toBeTruthy()
  })

  it('shows the empty state for recent activity when there is none', async () => {
    mockedFetchDashboardData.mockResolvedValue({ stats: [], recentActivity: [] })

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('هنوز فعالیتی ثبت نشده')).toBeTruthy()
  })

  it('navigates to CreateProperty when the add-property quick action is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'پرونده‌های ملکی', value: '0' }],
      recentActivity: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('افزودن پرونده ملکی'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateProperty')
  })

  it('navigates to PropertyList when the properties stat card is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'پرونده‌های ملکی', value: '3' }],
      recentActivity: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('پرونده‌های ملکی: 3'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyList')
  })
})
