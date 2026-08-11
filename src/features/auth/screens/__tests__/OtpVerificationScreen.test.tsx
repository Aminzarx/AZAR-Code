import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { OtpVerificationScreen } from '../OtpVerificationScreen'
import { useAuth } from '@features/auth/AuthProvider'
import { ValidationFailureError } from '@core/auth/errors'

jest.mock('@features/auth/AuthProvider')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockSendOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockLogin = jest.fn()
const mockNavigate = jest.fn()

const navigationProp = { navigate: mockNavigate } as never
const routeProp = {
  key: 'OtpVerification',
  name: 'OtpVerification' as const,
  params: { phoneNumber: '+989121234567' }
}

async function typeCode(getByLabelText: (label: string) => any, code: string): Promise<void> {
  for (let i = 0; i < code.length; i++) {
    const digit = code[i]
    await waitFor(() => {
      fireEvent.changeText(getByLabelText(`رقم ${i + 1} کد تأیید`), digit)
    })
  }
}

describe('OtpVerificationScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false })
    mockSendOtp.mockReset()
    mockVerifyOtp.mockReset()
    mockLogin.mockReset()
    mockNavigate.mockReset()
    mockedUseAuth.mockReturnValue({
      isInitializing: false,
      session: null,
      sendOtp: mockSendOtp,
      verifyOtp: mockVerifyOtp,
      register: jest.fn(),
      login: mockLogin,
      logout: jest.fn(),
      deleteAccount: jest.fn()
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('logs an already-registered number straight in without asking for a referral code', async () => {
    mockVerifyOtp.mockResolvedValue(undefined)
    mockLogin.mockResolvedValue({
      sessionId: 's1',
      userId: 'u1',
      referralCode: 'ABCD1234',
      sessionToken: 'tok'
    })
    const { getByLabelText } = await render(
      withTheme(<OtpVerificationScreen navigation={navigationProp} route={routeProp} />)
    )

    await typeCode(getByLabelText, '518322')

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith('+989121234567', '518322'))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('+989121234567'))
    expect(mockNavigate).not.toHaveBeenCalledWith('ReferralCode', expect.anything())
  })

  it('sends a new number to the referral-code screen when no account exists yet', async () => {
    mockVerifyOtp.mockResolvedValue(undefined)
    mockLogin.mockRejectedValue(
      new ValidationFailureError('No account found for this number.', 'invalid_phone_number')
    )
    const { getByLabelText } = await render(
      withTheme(<OtpVerificationScreen navigation={navigationProp} route={routeProp} />)
    )

    await typeCode(getByLabelText, '518322')

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ReferralCode', { phoneNumber: '+989121234567' })
    )
  })

  it('shows an error message and does not navigate when verification fails', async () => {
    mockVerifyOtp.mockRejectedValue(new ValidationFailureError('کد نامعتبر است.', 'invalid_otp'))
    const { getByLabelText, findByText } = await render(
      withTheme(<OtpVerificationScreen navigation={navigationProp} route={routeProp} />)
    )

    await typeCode(getByLabelText, '000000')

    expect(await findByText('کد نامعتبر است.')).toBeTruthy()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('disables resend until the 2-minute cooldown elapses, then allows it', async () => {
    mockSendOtp.mockResolvedValue(undefined)
    const { getByLabelText } = await render(
      withTheme(<OtpVerificationScreen navigation={navigationProp} route={routeProp} />)
    )

    const resendButton = getByLabelText('ارسال مجدد کد')
    expect(resendButton.props.accessibilityState?.disabled).toBe(true)

    await waitFor(() => {
      jest.advanceTimersByTime(120000)
    })

    expect(getByLabelText('ارسال مجدد کد').props.accessibilityState?.disabled).toBeFalsy()

    await fireEvent.press(getByLabelText('ارسال مجدد کد'))
    expect(mockSendOtp).toHaveBeenCalledWith('+989121234567')
  })
})
