import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReminderDetailScreen } from '../ReminderDetailScreen'
import { useReminderDetail } from '../../hooks/useReminderDetail'
import { useReminderService } from '../../hooks/useReminderService'
import { useReminderContext } from '../../hooks/useReminderContext'
import type { Reminder } from '../../types'

jest.mock('../../hooks/useReminderDetail')
jest.mock('../../hooks/useReminderService')
jest.mock('../../hooks/useReminderContext')
jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

const mockedUseReminderDetail = useReminderDetail as jest.MockedFunction<typeof useReminderDetail>
const mockedUseReminderService = useReminderService as jest.MockedFunction<
  typeof useReminderService
>
const mockedUseReminderContext = useReminderContext as jest.MockedFunction<
  typeof useReminderContext
>
const mockUpdateReminder = jest.fn()
const mockSetDone = jest.fn()
const mockDeleteReminder = jest.fn()
const mockGoBack = jest.fn()
const mockNavigate = jest.fn()

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

const navigationProp = { goBack: mockGoBack, navigate: mockNavigate } as never
const routeProp = {
  key: 'ReminderDetail',
  name: 'ReminderDetail' as const,
  params: { reminderId: 'rem-1' }
}

describe('ReminderDetailScreen', () => {
  beforeEach(() => {
    mockUpdateReminder.mockReset()
    mockSetDone.mockReset()
    mockDeleteReminder.mockReset()
    mockGoBack.mockReset()
    mockNavigate.mockReset()
    mockedUseReminderService.mockReturnValue({
      updateReminder: mockUpdateReminder,
      setDone: mockSetDone,
      deleteReminder: mockDeleteReminder
    } as never)
    mockedUseReminderContext.mockReturnValue(null)
  })

  it('shows the reminder title and description', async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: { ...REMINDER, description: 'توضیحات' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('تماس با متقاضی')).toBeTruthy()
    expect(await findByText('توضیحات')).toBeTruthy()
  })

  it('navigates back when the header back button is pressed', async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: REMINDER,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازگشت'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('shows the linked property/applicant context when the reminder is tied to a deal', async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: { ...REMINDER, dealId: 'deal-1' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseReminderContext.mockReturnValue({
      primary: 'آپارتمان ولیعصر',
      secondary: 'محمد رضایی'
    })

    const { findByText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان ولیعصر')).toBeTruthy()
    expect(await findByText('محمد رضایی')).toBeTruthy()
  })

  it("navigates to the linked deal when a deal-linked reminder's context is pressed", async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: { ...REMINDER, dealId: 'deal-1' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseReminderContext.mockReturnValue({
      primary: 'آپارتمان ولیعصر',
      secondary: 'محمد رضایی'
    })

    const { findByLabelText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان ولیعصر'))
    expect(mockNavigate).toHaveBeenCalledWith('DealDetail', { dealId: 'deal-1' })
  })

  it("navigates to the linked property when a property-only reminder's context is pressed", async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: { ...REMINDER, propertyId: 'prop-1' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseReminderContext.mockReturnValue({ primary: 'آپارتمان ولیعصر' })

    const { findByLabelText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان ولیعصر'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
  })

  it("navigates to the linked applicant when an applicant-only reminder's context is pressed", async () => {
    mockedUseReminderDetail.mockReturnValue({
      reminder: { ...REMINDER, applicantId: 'app-1' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseReminderContext.mockReturnValue({ primary: 'محمد رضایی' })

    const { findByLabelText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('محمد رضایی'))
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
  })

  it('shows an error state with retry when loading fails', async () => {
    const refetch = jest.fn()
    mockedUseReminderDetail.mockReturnValue({
      reminder: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری یادآوری با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('switches to edit mode and submits an update', async () => {
    mockUpdateReminder.mockResolvedValue({ ...REMINDER, title: 'عنوان جدید' })
    mockedUseReminderDetail.mockReturnValue({
      reminder: REMINDER,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText, getByLabelText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ویرایش'))
    expect(await findByText('ذخیره')).toBeTruthy()

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان'), 'عنوان جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockUpdateReminder).toHaveBeenCalledWith(
        'rem-1',
        expect.objectContaining({ title: 'عنوان جدید' }),
        { propertyId: null, applicantId: null, dealId: null }
      )
    )
  })

  it('toggles done state', async () => {
    mockSetDone.mockResolvedValue({ ...REMINDER, isDone: true })
    const refetch = jest.fn()
    mockedUseReminderDetail.mockReturnValue({
      reminder: REMINDER,
      isLoading: false,
      error: null,
      refetch
    })

    const { findByText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    const toggleButton = await findByText('علامت‌گذاری به‌عنوان انجام‌شده')
    await waitFor(() => fireEvent.press(toggleButton))

    await waitFor(() => expect(mockSetDone).toHaveBeenCalledWith('rem-1', true, 'u1'))
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('deletes the reminder after confirmation and navigates back', async () => {
    mockDeleteReminder.mockResolvedValue(undefined)
    mockedUseReminderDetail.mockReturnValue({
      reminder: REMINDER,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ReminderDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('حذف یادآوری'))
    fireEvent.press(await findByText('حذف'))

    await waitFor(() => expect(mockDeleteReminder).toHaveBeenCalledWith('rem-1'))
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1))
  })
})
