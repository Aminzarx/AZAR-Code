import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SettingsScreen } from '../SettingsScreen'

const mockLogout = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'AZARSEED', sessionToken: 't1' },
    logout: mockLogout
  })
}))

const navigationProp = {} as never
const routeProp = { key: 'Settings', name: 'Settings' as const, params: undefined }

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockLogout.mockReset()
  })

  it('shows the referral code', async () => {
    const { findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect((await findByLabelText('کد معرف شما')).props.children).toBe('AZARSEED')
  })

  it('logs out when the logout button is pressed', async () => {
    const { findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('خروج از حساب'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})
