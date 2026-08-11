import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReminderListScreen } from '../ReminderListScreen'
import { useReminders } from '../../hooks/useReminders'
import { useReminderService } from '../../hooks/useReminderService'
import { useReminderContexts } from '../../hooks/useReminderContexts'
import type { Reminder } from '../../types'

const mockNavigate = jest.fn()
const mockSetDone = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useReminders')
jest.mock('../../hooks/useReminderService')
jest.mock('../../hooks/useReminderContexts')

const mockedUseReminders = useReminders as jest.MockedFunction<typeof useReminders>
const mockedUseReminderService = useReminderService as jest.MockedFunction<
  typeof useReminderService
>
const mockedUseReminderContexts = useReminderContexts as jest.MockedFunction<
  typeof useReminderContexts
>

const REMINDER: Reminder = {
  id: 'rem-1',
  userId: 'u1',
  propertyId: null,
  applicantId: null,
  dealId: null,
  title: 'تماس با متقاضی',
  description: null,
  remindAt: '2026-09-01T14:30:00.000Z',
  reminderType: 'general',
  isDone: false,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'ReminderList', name: 'ReminderList' as const, params: undefined }

describe('ReminderListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockSetDone.mockReset()
    mockedUseReminders.mockReset()
    mockedUseReminderService.mockReturnValue({ setDone: mockSetDone } as never)
    mockedUseReminderContexts.mockReturnValue({ isLoading: false, resolve: () => null })
  })

  it('shows the empty state when there are no reminders', async () => {
    mockedUseReminders.mockReturnValue({
      reminders: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('هنوز یادآوری‌ای ثبت نشده')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseReminders.mockReturnValue({
      reminders: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('بارگذاری یادآوری‌ها با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to ReminderDetail when a reminder is pressed', async () => {
    mockedUseReminders.mockReturnValue({
      reminders: [REMINDER],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تماس با متقاضی'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })
  })

  it('toggles done state when the checkbox is pressed', async () => {
    mockSetDone.mockResolvedValue({ ...REMINDER, isDone: true })
    const refetch = jest.fn()
    mockedUseReminders.mockReturnValue({
      reminders: [REMINDER],
      isLoading: false,
      error: null,
      refetch
    })

    const { findByLabelText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )

    const checkbox = await findByLabelText('علامت‌گذاری تماس با متقاضی به‌عنوان انجام‌شده')
    await waitFor(() => fireEvent.press(checkbox))

    await waitFor(() => expect(mockSetDone).toHaveBeenCalledWith('rem-1', true, 'u1'))
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('groups reminders under time-based section headers', async () => {
    mockedUseReminders.mockReturnValue({
      reminders: [REMINDER],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بعداً')).toBeTruthy()
  })

  it('shows the overdue and due-today attention header when there is something to flag', async () => {
    const overdue: Reminder = {
      ...REMINDER,
      id: 'rem-overdue',
      remindAt: '2000-01-01T00:00:00.000Z'
    }
    mockedUseReminders.mockReturnValue({
      reminders: [overdue],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('۱ پیگیری عقب‌افتاده')).toBeTruthy()
  })

  it('shows a linked reminder’s context inline', async () => {
    mockedUseReminders.mockReturnValue({
      reminders: [REMINDER],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseReminderContexts.mockReturnValue({
      isLoading: false,
      resolve: () => ({ primary: 'آپارتمان ولیعصر' })
    })

    const { findByText } = await render(
      withTheme(<ReminderListScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان ولیعصر')).toBeTruthy()
  })
})
