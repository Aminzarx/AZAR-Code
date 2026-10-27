import React from 'react'
import { PermissionsAndroid } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReferralCodeScreen } from '../ReferralCodeScreen'
import { useAuth } from '@features/auth/AuthProvider'

jest.mock('@features/auth/AuthProvider')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockRegister = jest.fn()

const FIELD = 'کد معرف یا شمارهٔ موبایل معرف'

const routeProp = {
  key: 'ReferralCode',
  name: 'ReferralCode' as const,
  params: { phoneNumber: '+989121234567', displayName: 'علی رضایی' }
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
      deleteAccount: jest.fn(),
      createInvite: jest.fn(),
      changePhone: jest.fn(),
      getSupportContacts: jest.fn(),
      sync: { state: 'idle', pending: 0, usage: null, loaded: true, settled: true },
      syncNow: jest.fn(),
      loadPhoto: jest.fn(),
      getTokenLedger: jest.fn(),
      tokenPurchase: null,
      announcements: null,
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

    expect(getByLabelText(FIELD).props.value).toBe('ABCD1234')
  })

  it('submits the uppercased referral code on تکمیل ثبت‌نام', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText(FIELD), 'abcd1234')
    await fireEvent.press(getByText('ورود به برنامه'))

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('+989121234567', 'ABCD1234', {
        displayName: 'علی رضایی',
        agencyName: undefined
      })
    )
  })

  it('enables the submit button for the 6-character AMINZX mother code', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText(FIELD), 'AMINZX')
    await fireEvent.press(getByText('ورود به برنامه'))

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('+989121234567', 'AMINZX', expect.anything())
    )
  })

  it('keeps the submit button disabled below 6 characters', async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )

    await fireEvent.changeText(getByLabelText(FIELD), 'AMIN')
    await fireEvent.press(getByText('ورود به برنامه'))

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it("takes the inviter's mobile (Persian digits too) in the same field (Amin #5563)", async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )
    await fireEvent.changeText(getByLabelText(FIELD), '۰۹۱۲۷۷۷۸۸۹۹')
    await fireEvent.press(getByText('ورود به برنامه'))
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('+989121234567', '09127778899', expect.anything())
    )
  })

  it('never fills a code by itself, whatever is on the clipboard (Amin #5563)', async () => {
    const { getByLabelText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )
    expect(getByLabelText(FIELD).props.value).toBe('')
  })

  it("refuses the new member's own number as the inviter", async () => {
    const { getByLabelText, getByText } = await render(
      withTheme(<ReferralCodeScreen navigation={{} as never} route={routeProp} />)
    )
    await fireEvent.changeText(getByLabelText(FIELD), '09121234567')
    await fireEvent.press(getByText('ورود به برنامه'))
    expect(mockRegister).not.toHaveBeenCalled()
    expect(getByText('شمارهٔ خودتان را نمی‌توانید وارد کنید.')).toBeTruthy()
  })
})
