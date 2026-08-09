import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
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

  it('appends zeros when a quick-zero chip is pressed', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('افزودن 6 صفر (میلیون)'))
    expect(onChangeValue).toHaveBeenCalledWith('5000000')
  })

  it('offers a ده هزار quick-add chip by default', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('افزودن 4 صفر (ده هزار)'))
    await waitFor(() => expect(onChangeValue).toHaveBeenCalledWith('50000'))
  })

  it('offers a صد هزار quick-add chip by default', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="5" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('افزودن 5 صفر (صد هزار)'))
    await waitFor(() => expect(onChangeValue).toHaveBeenCalledWith('500000'))
  })

  it('does not append zeros when the field is empty', async () => {
    const onChangeValue = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<MoneyInput label="قیمت" value="" onChangeValue={onChangeValue} />)
    )
    fireEvent.press(getByLabelText('افزودن 3 صفر (هزار)'))
    expect(onChangeValue).not.toHaveBeenCalled()
  })

  it('shows a required asterisk when required', async () => {
    const { getByText } = await render(
      withTheme(<MoneyInput label="قیمت" value="" onChangeValue={jest.fn()} required />)
    )
    expect(getByText('*')).toBeTruthy()
  })
})
