import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { OfficePanelScreen } from '../OfficePanelScreen'

const mockStatus = jest.fn()
const mockRequest = jest.fn()
const mockCancel = jest.fn()
jest.mock('@features/auth/AuthProvider', () => ({ useAuth: () => ({ session: { sessionToken: 't' } }) }))
jest.mock('../../services/officePanel', () => ({
  OFFICE_REQUEST_CONFIRM_TEXT: 'متن تأیید امین',
  loadOfficeStatus: (...a: unknown[]) => mockStatus(...a),
  notePortal: jest.fn(),
  officeClient: {
    officeRequest: (...a: unknown[]) => mockRequest(...a),
    officeCancel: (...a: unknown[]) => mockCancel(...a)
  },
  officeErrorText: () => 'خطا'
}))

const navigation = { goBack: jest.fn() } as never
const route = { key: 'OfficePanel', name: 'OfficePanel' as const, params: undefined }
const pending = { id: 'r1', status: 'pending', address: 'ونک', unionLicence: false, landline: null, username: 'parse_office', createdAt: '', decidedAt: null }

describe('OfficePanelScreen (Amin #5970/#6034)', () => {
  beforeEach(() => {
    mockStatus.mockReset()
    mockRequest.mockReset()
    mockCancel.mockReset()
  })

  it('sends address, licence, landline, username and password after Amin\'s confirm text', async () => {
    mockStatus.mockResolvedValue({ request: null, portal: false })
    mockRequest.mockResolvedValue({ request: pending, portal: false })
    const { getByText, getAllByText, getByLabelText, findByText } = await render(
      withTheme(<OfficePanelScreen navigation={navigation} route={route} />)
    )
    await findByText('ارسال درخواست')
    await fireEvent.changeText(getByLabelText('آدرس دفتر'), 'تهران، ونک')
    await fireEvent.changeText(getByLabelText('تلفن ثابت دفتر'), '۰۲۱۸۸۷۷۶۶۵۵')
    await fireEvent.changeText(getByLabelText('نام کاربری'), 'Parse_Office')
    await fireEvent.changeText(getByLabelText('رمز'), 'parse-1234')
    await fireEvent.press(getByText('ارسال درخواست'))
    expect(getByText('متن تأیید امین')).toBeTruthy()
    const confirm = getAllByText('ارسال درخواست')
    await fireEvent.press(confirm[confirm.length - 1])
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith('t', {
        address: 'تهران، ونک',
        unionLicence: false,
        landline: '02188776655',
        username: 'parse_office',
        password: 'parse-1234'
      })
    )
    expect(await findByText('لغو درخواست')).toBeTruthy()
  })

  it('a pending request shows «لغو درخواست» instead of the form', async () => {
    mockStatus.mockResolvedValue({ request: pending, portal: false })
    const { findByText, queryByText } = await render(withTheme(<OfficePanelScreen navigation={navigation} route={route} />))
    expect(await findByText('لغو درخواست')).toBeTruthy()
    expect(queryByText('ارسال درخواست')).toBeNull()
  })

  it('a form with a short password does not send', async () => {
    mockStatus.mockResolvedValue({ request: null, portal: false })
    const { getByText, getByLabelText, findByText, queryByText } = await render(withTheme(<OfficePanelScreen navigation={navigation} route={route} />))
    await findByText('ارسال درخواست')
    await fireEvent.changeText(getByLabelText('آدرس دفتر'), 'ونک')
    await fireEvent.changeText(getByLabelText('نام کاربری'), 'parse_office')
    await fireEvent.changeText(getByLabelText('رمز'), '123')
    await fireEvent.press(getByText('ارسال درخواست'))
    await waitFor(() => expect(getByText('رمز دست‌کم ۸ حرف باشد.')).toBeTruthy())
    expect(queryByText('متن تأیید امین')).toBeNull()
  })
})
