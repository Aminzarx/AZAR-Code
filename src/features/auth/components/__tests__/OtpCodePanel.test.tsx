import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { useAuth } from '@features/auth/AuthProvider'
import { listenForSmsCode } from '@infrastructure/sms/smsCodeReader'
import { OtpCodePanel } from '../OtpCodePanel'

jest.mock('@features/auth/AuthProvider')
jest.mock('@infrastructure/sms/smsCodeReader', () => ({
  listenForSmsCode: jest.fn()
}))

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockListen = listenForSmsCode as jest.MockedFunction<typeof listenForSmsCode>

describe('OtpCodePanel — code from the SMS (v1.2.0, Amin #4229)', () => {
  it('fills and checks the code once Android hands over the SMS', async () => {
    const verifyOtp = jest.fn().mockResolvedValue(undefined)
    const stop = jest.fn()
    let deliver: ((code: string) => void) | undefined
    mockListen.mockImplementation((length, onCode) => {
      expect(length).toBe(6)
      deliver = onCode
      return stop
    })
    mockedUseAuth.mockReturnValue({
      isInitializing: false,
      session: null,
      sendOtp: jest.fn(),
      verifyOtp,
      register: jest.fn(),
      login: jest.fn().mockResolvedValue({}),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      createInvite: jest.fn(),
      changePhone: jest.fn(),
      getSupportContacts: jest.fn(),
      sync: { state: 'idle', pending: 0, usage: null, loaded: true, settled: true },
      syncNow: jest.fn(),
      loadPhoto: jest.fn(),
      getTokenLedger: jest.fn()
    })

    const { unmount } = await render(
      withTheme(<OtpCodePanel phoneNumber="+989121234567" onNeedsReferral={jest.fn()} />)
    )
    expect(mockListen).toHaveBeenCalled()

    await act(async () => {
      deliver?.('246810')
    })

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith('+989121234567', '246810'))
    await act(async () => {
      await unmount()
    })
    expect(stop).toHaveBeenCalled()
  })
})
