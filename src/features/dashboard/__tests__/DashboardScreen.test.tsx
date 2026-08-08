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
      recentActivity: [],
      upcomingReminders: []
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
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('هنوز فعالیتی ثبت نشده')).toBeTruthy()
  })

  it('navigates to CreateProperty when the add-property quick action is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'پرونده‌های ملکی', value: '0' }],
      recentActivity: [],
      upcomingReminders: []
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
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('پرونده‌های ملکی: 3'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyList')
  })

  it('navigates to CreateApplicant when the add-applicant quick action is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'applicants', label: 'متقاضیان', value: '0' }],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('افزودن متقاضی'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateApplicant')
  })

  it('navigates to ApplicantList when the applicants stat card is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'applicants', label: 'متقاضیان', value: '5' }],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('متقاضیان: 5'))
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantList')
  })

  it('navigates to DealList when the "مشاهده پیگیری‌ها" quick action is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'contracts', label: 'پیگیری‌های فعال', value: '0' }],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('مشاهده پیگیری‌ها'))
    expect(mockNavigate).toHaveBeenCalledWith('DealList')
  })

  it('shows the empty state for upcoming reminders when there are none', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('یادآوری نزدیکی وجود ندارد')).toBeTruthy()
  })

  it('navigates to ReminderDetail when an upcoming reminder is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      recentActivity: [],
      upcomingReminders: [{ id: 'rem-1', title: 'تماس با متقاضی', timestamp: '۱۴۰۴/۰۵/۲۰' }]
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تماس با متقاضی'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })
  })
})
