import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { MoneyInput } from '../MoneyInput'

describe('MoneyInput', () => {
  it('formats the numeric value with thousand separators', async () => {
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="1000000000" onChangeValue={jest.fn()} />)
    )
    expect(getByLabelText('قیمت').props.value).toBe('1,000,000,000')
  })

  it('reports a plain numeric string when the user types, stripping separators', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="" onChangeValue={onChangeValue} />)
    )
    fireEvent.changeText(getByLabelText('قیمت'), '5000000')
    expect(onChangeValue).toHaveBeenCalledWith('5000000')
  })

  it('shows the میلیون chip as a comma-grouped zero string, not a word', async () => {
    const { getByText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={jest.fn()} />)
    )
    expect(getByText('000,000')).toBeTruthy()
  })

  it('shows the میلیارد chip as a comma-grouped zero string', async () => {
    const { getByText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={jest.fn()} />)
    )
    expect(getByText('000,000,000')).toBeTruthy()
  })

  it('appends zeros when the میلیون chip is pressed', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('ضرب عدد وارد شده در یک میلیون'))
    expect(onChangeValue).toHaveBeenCalledWith('5000000')
  })

  it('appends zeros when the میلیارد chip is pressed', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('ضرب عدد وارد شده در یک میلیارد'))
    expect(onChangeValue).toHaveBeenCalledWith('5000000000')
  })

  it('does not append zeros when the field is empty', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('ضرب عدد وارد شده در یک میلیون'))
    expect(onChangeValue).not.toHaveBeenCalled()
  })

  it('shows a required asterisk when required', async () => {
    const { getByText } = await render(
      withTheme(<MoneyInput label="قیمت" value="" onChangeValue={jest.fn()} required />)
    )
    expect(getByText('*')).toBeTruthy()
  })
})
