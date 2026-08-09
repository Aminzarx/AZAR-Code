import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { OtpVerificationScreen } from '../OtpVerificationScreen'
import { useAuth } from '@features/auth/AuthProvider'
import { ValidationFailureError } from '@core/auth/errors'

jest.mock('@features/auth/AuthProvider')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockVerifyOtp = jest.fn()
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
    mockVerifyOtp.mockReset()
    mockNavigate.mockReset()
    mockedUseAuth.mockReturnValue({
      isInitializing: false,
      session: null,
      sendOtp: jest.fn(),
      verifyOtp: mockVerifyOtp,
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn()
    })
  })

  it('auto-submits once all 6 digits are entered and navigates after the success animation', async () => {
    mockVerifyOtp.mockResolvedValue(undefined)
    const { getByLabelText } = await render(
      withTheme(<OtpVerificationScreen navigation={navigationProp} route={routeProp} />)
    )

    await typeCode(getByLabelText, '518322')

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith('+989121234567', '518322'))
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
})
