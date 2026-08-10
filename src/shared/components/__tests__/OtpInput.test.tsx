import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { OtpInput } from '../OtpInput'

describe('OtpInput', () => {
  it('renders 6 digit boxes', async () => {
    const { getByLabelText } = await render(
      withTheme(<OtpInput value="" onChangeValue={jest.fn()} />)
    )

    for (let i = 1; i <= 6; i++) {
      expect(getByLabelText(`رقم ${i} کد تأیید`)).toBeTruthy()
    }
  })

  it('fills a single digit and reports the assembled value', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<OtpInput value="" onChangeValue={onChangeValue} />)
    )

    fireEvent.changeText(getByLabelText('رقم 1 کد تأیید'), '5')
    expect(onChangeValue).toHaveBeenCalledWith('5')
  })

  it('distributes a pasted 6-digit code across all boxes from the first one', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<OtpInput value="" onChangeValue={onChangeValue} />)
    )

    fireEvent.changeText(getByLabelText('رقم 1 کد تأیید'), '518322')
    expect(onChangeValue).toHaveBeenCalledWith('518322')
  })

  it('clears the previous box on backspace when the current box is empty', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<OtpInput value="12" onChangeValue={onChangeValue} />)
    )

    fireEvent(getByLabelText('رقم 3 کد تأیید'), 'keyPress', {
      nativeEvent: { key: 'Backspace' }
    })
    expect(onChangeValue).toHaveBeenCalledWith('1')
  })

  it('deletes a middle box directly via backspace, without needing to reach it from the last box', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<OtpInput value="123456" onChangeValue={onChangeValue} />)
    )

    fireEvent(getByLabelText('رقم 3 کد تأیید'), 'keyPress', {
      nativeEvent: { key: 'Backspace' }
    })
    expect(onChangeValue).toHaveBeenCalledWith('12456')
  })

  it('calls onSuccessAnimationComplete once the success sweep finishes', async () => {
    const onComplete = jest.fn()
    await render(
      withTheme(
        <OtpInput
          value="518322"
          onChangeValue={jest.fn()}
          status="success"
          onSuccessAnimationComplete={onComplete}
        />
      )
    )

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 3000 })
  })
})
