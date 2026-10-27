import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { RegisterNameScreen } from '../RegisterNameScreen'

const route = { key: 'RegisterName', name: 'RegisterName' as const, params: { phoneNumber: '+989121234567' } }

describe('RegisterNameScreen (Amin #5348, #5745)', () => {
  it('asks a new account its first and last name after the code, then goes on to the invite page', async () => {
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

  it('says what is missing instead of a dead button (Amin #5746)', async () => {
    const navigate = jest.fn()
    const { getByText } = await render(withTheme(<RegisterNameScreen navigation={{ navigate } as never} route={route} />))
    await fireEvent.press(getByText('ادامه'))
    expect(navigate).not.toHaveBeenCalled()
    expect(getByText('نام را بنویسید (دست‌کم ۲ حرف).')).toBeTruthy()
    expect(getByText('نام خانوادگی را بنویسید (دست‌کم ۲ حرف).')).toBeTruthy()
  })

  it('splits a whole name typed in «نام» when the last name is left empty', async () => {
    const navigate = jest.fn()
    const { getByLabelText, getByText } = await render(
      withTheme(<RegisterNameScreen navigation={{ navigate } as never} route={route} />)
    )
    await fireEvent.changeText(getByLabelText('نام'), ' امین  زرندی ')
    await fireEvent.press(getByText('ادامه'))
    expect(navigate).toHaveBeenCalledWith('ReferralCode', {
      phoneNumber: '+989121234567',
      displayName: 'امین زرندی',
      agencyName: undefined
    })
  })
})
