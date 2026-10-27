import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PhoneEntryScreen } from '../PhoneEntryScreen'
import { useAuth } from '@features/auth/AuthProvider'

jest.mock('@features/auth/AuthProvider')
// the code panel stands in for «the server has no account for this number»
jest.mock('@features/auth/components/OtpCodePanel', () => {
  const { Pressable, Text } = require('react-native')
  return {
    OtpCodePanel: ({ phoneNumber, onNeedsReferral }: { phoneNumber: string; onNeedsReferral: (p: string) => void }) => (
      <Pressable accessibilityRole="button" onPress={() => onNeedsReferral(phoneNumber)}>
        <Text>no-account</Text>
      </Pressable>
    )
  }
})

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('PhoneEntryScreen (Amin #5745: number first)', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ sendOtp: jest.fn().mockResolvedValue(undefined) } as never)
  })

  async function reachNoAccount(params: { displayName?: string } | undefined) {
    const navigate = jest.fn()
    const route = { key: 'PhoneEntry', name: 'PhoneEntry' as const, params }
    const screen = await render(withTheme(<PhoneEntryScreen navigation={{ navigate } as never} route={route} />))
    await waitFor(() => fireEvent.changeText(screen.getByLabelText('لطفا شماره خود را وارد کنید'), '09121234567'))
    await waitFor(() => fireEvent.press(screen.getByText('دریافت کد تأیید')))
    await waitFor(() => fireEvent.press(screen.getByText('no-account')))
    return navigate
  }

  it('sends a number with no account to the name page', async () => {
    const navigate = await reachNoAccount(undefined)
    expect(navigate).toHaveBeenCalledWith('RegisterName', { phoneNumber: '+989121234567' })
  })

  it('an old link that already carries the name goes straight to the invite page', async () => {
    const navigate = await reachNoAccount({ displayName: 'علی رضایی' })
    expect(navigate).toHaveBeenCalledWith('ReferralCode', {
      phoneNumber: '+989121234567',
      displayName: 'علی رضایی',
      agencyName: undefined
    })
  })
})
