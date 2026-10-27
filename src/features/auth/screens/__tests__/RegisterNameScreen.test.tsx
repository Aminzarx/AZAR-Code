import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { RegisterNameScreen } from '../RegisterNameScreen'

const route = { key: 'RegisterName', name: 'RegisterName' as const, params: { phoneNumber: '+989121234567' } }

describe('RegisterNameScreen (Amin #5348)', () => {
  it('asks first and last name, then goes on to the invite page with them', async () => {
    const navigate = jest.fn()
    const { getByLabelText, getByText } = await render(
      withTheme(<RegisterNameScreen navigation={{ navigate } as never} route={route} />)
    )
    await fireEvent.press(getByText('ادامه'))
    expect(navigate).not.toHaveBeenCalled()

    await fireEvent.changeText(getByLabelText('نام'), 'علی')
    await fireEvent.changeText(getByLabelText('نام خانوادگی'), 'رضایی')
    await fireEvent.press(getByText('ادامه'))
    expect(navigate).toHaveBeenCalledWith('ReferralCode', {
      phoneNumber: '+989121234567',
      displayName: 'علی رضایی',
      agencyName: undefined
    })
  })
})
