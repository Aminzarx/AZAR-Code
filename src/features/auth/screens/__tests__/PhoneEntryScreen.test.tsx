import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PhoneEntryScreen } from '../PhoneEntryScreen'
import { useAuth } from '@features/auth/AuthProvider'

jest.mock('@features/auth/AuthProvider')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockSendOtp = jest.fn()
const navigationProp = { navigate: jest.fn() } as never
const routeProp = { key: 'PhoneEntry', name: 'PhoneEntry' as const, params: undefined }

describe('PhoneEntryScreen (v3.0.0 one-page sign-in, Amin #4205)', () => {
  beforeEach(() => {
    mockSendOtp.mockReset()
    mockSendOtp.mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({
      isInitializing: false,
      session: null,
      sendOtp: mockSendOtp,
      verifyOtp: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      createInvite: jest.fn(),
      changePhone: jest.fn(),
      getSupportContacts: jest.fn(),
      sync: { state: 'idle', pending: 0, usage: null, loaded: true, settled: true },
      syncNow: jest.fn(),
      loadPhoto: jest.fn(),
      getTokenLedger: jest.fn(),
      tokenPurchase: null
    })
  })

  it('locks the number once the code is sent; only «ویرایش شماره» unlocks it', async () => {
    const { getByLabelText, getByText, queryByLabelText } = await render(
      withTheme(<PhoneEntryScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('لطفا شماره خود را وارد کنید'), '09121234567'))
    await waitFor(() => fireEvent.press(getByText('دریافت کد تأیید')))

    await waitFor(() => expect(mockSendOtp).toHaveBeenCalledWith('+989121234567'))
    await waitFor(() => expect(getByLabelText('لطفا شماره خود را وارد کنید').props.editable).toBe(false))
    expect(getByLabelText('رقم 1 کد تأیید')).toBeTruthy()
    expect(queryByLabelText('دریافت کد تأیید')).toBeNull()

    await waitFor(() => fireEvent.press(getByLabelText('ویرایش شماره')))

    await waitFor(() => expect(getByLabelText('لطفا شماره خود را وارد کنید').props.editable).toBe(true))
    expect(queryByLabelText('رقم 1 کد تأیید')).toBeNull()
    expect(getByText('دریافت کد تأیید')).toBeTruthy()
  })

  it('does not show the old «read automatically» note', async () => {
    const { queryByText } = await render(
      withTheme(<PhoneEntryScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(queryByText(/خودکار/)).toBeNull()
  })
})
