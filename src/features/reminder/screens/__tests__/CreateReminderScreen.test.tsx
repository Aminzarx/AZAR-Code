import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { CreateReminderScreen } from '../CreateReminderScreen'
import { useReminderService } from '../../hooks/useReminderService'
import { ReminderValidationError } from '../../validation/ReminderValidationError'

const mockReplace = jest.fn()
const mockCreateReminder = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useReminderService')

const mockedUseReminderService = useReminderService as jest.MockedFunction<
  typeof useReminderService
>

const navigationProp = { replace: mockReplace } as never

describe('CreateReminderScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockCreateReminder.mockReset()
    mockedUseReminderService.mockReturnValue({ createReminder: mockCreateReminder } as never)
  })

  it('shows the field errors the service reports when required fields are empty', async () => {
    mockCreateReminder.mockRejectedValue(
      new ReminderValidationError({ title: 'عنوان الزامی است.' })
    )
    const routeProp = { key: 'CreateReminder', name: 'CreateReminder' as const, params: undefined }

    const { getByText, findByText } = await render(
      withTheme(<CreateReminderScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    expect(await findByText('عنوان الزامی است.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('creates the reminder and navigates to its detail screen on success', async () => {
    mockCreateReminder.mockResolvedValue({ id: 'rem-1' })
    const routeProp = { key: 'CreateReminder', name: 'CreateReminder' as const, params: undefined }

    const { getByLabelText, getByText } = await render(
      withTheme(<CreateReminderScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان'), 'تماس با متقاضی'))
    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ'), '2026-09-01'))
    await waitFor(() => fireEvent.changeText(getByLabelText('زمان'), '14:30'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockCreateReminder).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ title: 'تماس با متقاضی', date: '2026-09-01', time: '14:30' }),
        { propertyId: undefined, applicantId: undefined, dealId: undefined }
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })
    )
  })

  it('passes prefilled links from route params when launched from a deal', async () => {
    mockCreateReminder.mockResolvedValue({ id: 'rem-1' })
    const routeProp = {
      key: 'CreateReminder',
      name: 'CreateReminder' as const,
      params: { dealId: 'deal-1', propertyId: 'prop-1', applicantId: 'app-1' }
    }

    const { getByLabelText, getByText } = await render(
      withTheme(<CreateReminderScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان'), 'پیگیری قرارداد'))
    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ'), '2026-09-01'))
    await waitFor(() => fireEvent.changeText(getByLabelText('زمان'), '14:30'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockCreateReminder).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ title: 'پیگیری قرارداد' }),
        { propertyId: 'prop-1', applicantId: 'app-1', dealId: 'deal-1' }
      )
    )
  })
})
