import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TextInput } from '../TextInput'
import { withTheme } from '../testHelpers'

describe('TextInput', () => {
  it('renders its label and value', async () => {
    const { getByText, getByDisplayValue } = await render(
      withTheme(<TextInput label="شماره موبایل" value="0912" onChangeText={() => {}} />)
    )
    expect(getByText('شماره موبایل')).toBeTruthy()
    expect(getByDisplayValue('0912')).toBeTruthy()
  })

  it('calls onChangeText as the user types', async () => {
    const onChangeText = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<TextInput label="شماره موبایل" value="" onChangeText={onChangeText} />)
    )
    fireEvent.changeText(getByLabelText('شماره موبایل'), '0912345678')
    expect(onChangeText).toHaveBeenCalledWith('0912345678')
  })

  it('shows an error message when provided, instead of helper text', async () => {
    const { getByText, queryByText } = await render(
      withTheme(
        <TextInput
          label="شماره موبایل"
          value=""
          onChangeText={() => {}}
          helperText="یک شماره معتبر وارد کنید"
          errorMessage="شماره نامعتبر است"
        />
      )
    )
    expect(getByText('شماره نامعتبر است')).toBeTruthy()
    expect(queryByText('یک شماره معتبر وارد کنید')).toBeNull()
  })

  it('shows helper text when there is no error', async () => {
    const { getByText } = await render(
      withTheme(
        <TextInput
          label="شماره موبایل"
          value=""
          onChangeText={() => {}}
          helperText="یک شماره معتبر وارد کنید"
        />
      )
    )
    expect(getByText('یک شماره معتبر وارد کنید')).toBeTruthy()
  })
})
