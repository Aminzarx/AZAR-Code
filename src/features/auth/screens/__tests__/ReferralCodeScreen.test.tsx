import React from 'react'
import { PermissionsAndroid } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReferralCodeScreen } from '../ReferralCodeScreen'
import { useAuth } from '@features/auth/AuthProvider'

jest.mock('@features/auth/AuthProvider')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockRegister = jest.fn()

const routeProp = {
  key: 'ReferralCode',
  name: 'ReferralCode' as const,
  params: { phoneNumber: '+989121234567' }
}

describe('ReferralCodeScreen', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockedUseAuth.mockReturnValue({
      isInitializing: false,
      session: null,
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      register: mockRegister,
      login: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn()
    })
  })

  it('fills the referral code field after a successful scan', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)
    const { getByLabelText, getByTestId } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.press(getByLabelText('اسکن بارکد کد معرف'))
    await waitFor(() => expect(getByTestId('camera-kit-mock')).toBeTruthy())

    await fireEvent(getByTestId('camera-kit-mock'), 'readCode', {
      nativeEvent: { codeStringValue: 'abcd1234', codeFormat: 'qr' }
    })

    expect(getByLabelText('کد معرف').props.value).toBe('ABCD1234')
  })

  it('submits the uppercased referral code on تکمیل ثبت‌نام', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText('کد معرف'), 'abcd1234')
    await fireEvent.press(getByText('تکمیل ثبت‌نام'))

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('+989121234567', 'ABCD1234'))
  })

  it('enables the submit button for the 6-character AMINZX mother code', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText('کد معرف'), 'AMINZX')
    await fireEvent.press(getByText('تکمیل ثبت‌نام'))

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('+989121234567', 'AMINZX'))
  })

  it('keeps the submit button disabled below 6 characters', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText('کد معرف'), 'AMIN')
    await fireEvent.press(getByText('تکمیل ثبت‌نام'))

    expect(mockRegister).not.toHaveBeenCalled()
  })
})
