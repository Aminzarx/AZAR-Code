import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ContractStatusPicker } from '../ContractStatusPicker'

describe('ContractStatusPicker', () => {
  it('renders every status option', async () => {
    const { getByText } = await render(
      withTheme(<ContractStatusPicker status="active" onChange={jest.fn()} />)
    )

    expect(getByText('فعال')).toBeTruthy()
    expect(getByText('تکمیل‌شده')).toBeTruthy()
    expect(getByText('لغوشده')).toBeTruthy()
  })

  it('calls onChange with the selected status', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ContractStatusPicker status="active" onChange={onChange} />)
    )

    fireEvent.press(getByLabelText('تکمیل‌شده'))
    expect(onChange).toHaveBeenCalledWith('completed')
  })

  it('marks the current status as selected', async () => {
    const { getByLabelText } = await render(
      withTheme(<ContractStatusPicker status="cancelled" onChange={jest.fn()} />)
    )

    expect(getByLabelText('لغوشده').props.accessibilityState.selected).toBe(true)
    expect(getByLabelText('فعال').props.accessibilityState.selected).toBe(false)
  })
})
