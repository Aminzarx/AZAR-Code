import React from 'react'
import { Linking } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DashboardScreen } from '../DashboardScreen'
import { fetchDashboardData } from '../services/dashboardDataService'
import type { DashboardData } from '../types'

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

function homeData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    stats: [
      { id: 'properties', label: 'فایل ملکی', value: 24 },
      { id: 'applicants', label: 'متقاضی', value: 18 },
      { id: 'contracts', label: 'قرارداد فعال', value: 2 },
      { id: 'deals', label: 'پیگیری باز', value: 6 }
    ],
    followUps: [],
    hasOverdue: false,
    matches: { matchCount: 0, applicantCount: 0 },
    ...overrides
  }
}

// useDashboardData refetches via useFocusEffect, which needs a real
// navigation context — hence the NavigationContainer wrapper.
function renderDashboard() {
  return render(
    withTheme(
      <NavigationContainer>
        <DashboardScreen navigation={navigationProp} route={routeProp} />
      </NavigationContainer>
    )
  )
}

describe('DashboardScreen (v1.3.0 home)', () => {
  beforeEach(() => {
    mockedFetchDashboardData.mockReset()
    mockNavigate.mockReset()
  })

  it('shows the summary in Persian digits once data resolves', async () => {
    mockedFetchDashboardData.mockResolvedValue(homeData())

    const { findByText, getByText } = await renderDashboard()

    expect(await findByText('خلاصه')).toBeTruthy()
    expect(getByText('۲۴')).toBeTruthy()
    expect(getByText('پیگیری باز')).toBeTruthy()
    expect(mockedFetchDashboardData).toHaveBeenCalledWith('u1')
  })

  it('shows an error state with retry when the fetch fails', async () => {
    mockedFetchDashboardData.mockRejectedValue(new Error('اتصال برقرار نشد'))

    const { findByText } = await renderDashboard()

    expect(await findByText('بارگذاری خانه با مشکل مواجه شد')).toBeTruthy()
    expect(await findByText('اتصال برقرار نشد')).toBeTruthy()
  })

  it('opens the add screens from the two add buttons', async () => {
    mockedFetchDashboardData.mockResolvedValue(homeData())

    const { findByLabelText, getByLabelText } = await renderDashboard()

    await fireEvent.press(await findByLabelText('افزودن فایل ملکی'))
    await fireEvent.press(getByLabelText('افزودن متقاضی'))

    expect(mockNavigate).toHaveBeenCalledWith('CreateProperty')
    expect(mockNavigate).toHaveBeenCalledWith('CreateApplicant')
  })

  it('opens each list from its summary tile', async () => {
    mockedFetchDashboardData.mockResolvedValue(homeData())

    const { findByLabelText, getByLabelText } = await renderDashboard()

    await fireEvent.press(await findByLabelText('فایل ملکی: 24'))
    await fireEvent.press(getByLabelText('متقاضی: 18'))
    await fireEvent.press(getByLabelText('قرارداد فعال: 2'))
    await fireEvent.press(getByLabelText('پیگیری باز: 6'))

    expect(mockNavigate).toHaveBeenCalledWith('PropertyList')
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantList')
    expect(mockNavigate).toHaveBeenCalledWith('ContractList')
    expect(mockNavigate).toHaveBeenCalledWith('DealList')
  })

  it('shows the matching banner and opens Matching from it', async () => {
    mockedFetchDashboardData.mockResolvedValue(
      homeData({ matches: { matchCount: 5, applicantCount: 3 } })
    )

    const { findByText } = await renderDashboard()

    await fireEvent.press(await findByText('۵ تطبیق'))
    expect(mockNavigate).toHaveBeenCalledWith('Matching')
  })

  it("lists today's follow-ups, opens one, and calls from its phone button", async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    mockedFetchDashboardData.mockResolvedValue(
      homeData({
        hasOverdue: true,
        followUps: [
          {
            id: 'rem-1',
            title: 'بازدید آپارتمان سعادت‌آباد',
            subtitle: 'آقای رضایی',
            timeLabel: '۱۰:۳۰',
            isOverdue: false,
            phoneNumber: '09121234567'
          }
        ]
      })
    )

    const { findByLabelText, getByLabelText } = await renderDashboard()

    await fireEvent.press(await findByLabelText('بازدید آپارتمان سعادت‌آباد'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })

    await fireEvent.press(getByLabelText('تماس با آقای رضایی'))
    expect(openURL).toHaveBeenCalledWith('tel:09121234567')
    openURL.mockRestore()
  })

  it('says so when nothing is due today, and the bell opens reminders', async () => {
    mockedFetchDashboardData.mockResolvedValue(homeData())

    const { findByText, getByLabelText } = await renderDashboard()

    expect(await findByText('برای امروز پیگیری‌ای ثبت نشده است.')).toBeTruthy()
    await fireEvent.press(getByLabelText('یادآوری‌ها'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderList', undefined)
  })

  it('shows the first-steps checklist on a new account', async () => {
    mockedFetchDashboardData.mockResolvedValue(
      homeData({
        stats: [
          { id: 'properties', label: 'فایل ملکی', value: 0 },
          { id: 'applicants', label: 'متقاضی', value: 0 },
          { id: 'contracts', label: 'قرارداد فعال', value: 0 },
          { id: 'deals', label: 'پیگیری باز', value: 0 }
        ]
      })
    )

    const { findByText, getByLabelText, queryByText } = await renderDashboard()

    expect(await findByText('سه قدم تا اولین تطبیق')).toBeTruthy()
    expect(queryByText('خلاصه')).toBeNull()
    await fireEvent.press(getByLabelText('افزودن اولین متقاضی'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateApplicant')
  })
})
