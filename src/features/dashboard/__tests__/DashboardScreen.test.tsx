import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DashboardScreen } from '../DashboardScreen'
import { fetchDashboardData } from '../services/dashboardDataService'

const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
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
    mockNavigate.mockReset()
  })

  it('shows a loading indicator, then the stats once data resolves', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'فایل‌های ملکی', value: '2' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('فایل‌های ملکی')).toBeTruthy()
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
      needsAttention: [],
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
      stats: [{ id: 'properties', label: 'فایل‌های ملکی', value: '0' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('افزودن فایل ملکی'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateProperty')
  })

  it('navigates to PropertyList when the properties stat card is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'properties', label: 'فایل‌های ملکی', value: '3' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('فایل‌های ملکی: 3'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyList')
  })

  it('navigates to CreateApplicant when the add-applicant quick action is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'applicants', label: 'متقاضیان', value: '0' }],
      needsAttention: [],
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
      needsAttention: [],
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
      stats: [{ id: 'deals', label: 'پیگیری‌های فعال', value: '0' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('مشاهده پیگیری‌ها'))
    expect(mockNavigate).toHaveBeenCalledWith('DealList')
  })

  it('navigates to DealList when the deals stat card is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'deals', label: 'پیگیری‌های فعال', value: '2' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('پیگیری‌های فعال: 2'))
    expect(mockNavigate).toHaveBeenCalledWith('DealList')
  })

  it('navigates to ContractList when the contracts stat card is pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [{ id: 'contracts', label: 'قراردادهای فعال', value: '4' }],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('قراردادهای فعال: 4'))
    expect(mockNavigate).toHaveBeenCalledWith('ContractList')
  })

  it('shows the empty state for upcoming reminders when there are none', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      needsAttention: [],
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
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: [{ id: 'rem-1', title: 'تماس با متقاضی', timestamp: '۱۴۰۴/۰۵/۲۰' }]
    })

    const { findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تماس با متقاضی'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })
  })

  it('does not render a Needs Attention heading when there is nothing to show', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      needsAttention: [],
      recentActivity: [],
      upcomingReminders: []
    })

    const { queryByText, findByText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    // Wait for the loaded screen before asserting an absence.
    expect(await findByText('اقدامات سریع')).toBeTruthy()
    expect(queryByText('نیازمند توجه')).toBeNull()
  })

  it('renders a Needs Attention row and navigates to its target when pressed', async () => {
    mockedFetchDashboardData.mockResolvedValue({
      stats: [],
      needsAttention: [
        {
          id: 'overdue-applicant-reminders',
          label: '3 متقاضی نیازمند پیگیری',
          tone: 'attention',
          target: 'ApplicantList'
        }
      ],
      recentActivity: [],
      upcomingReminders: []
    })

    const { findByText, findByLabelText } = await render(
      withTheme(<DashboardScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('نیازمند توجه')).toBeTruthy()
    fireEvent.press(await findByLabelText('3 متقاضی نیازمند پیگیری'))
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantList')
  })
})
