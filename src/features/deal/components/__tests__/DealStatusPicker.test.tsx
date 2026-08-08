import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealStatusPicker } from '../DealStatusPicker'

describe('DealStatusPicker', () => {
  it('renders every status option', async () => {
    const { getByText } = await render(
      withTheme(<DealStatusPicker status="new" onChange={jest.fn()} />)
    )

    expect(getByText('جدید')).toBeTruthy()
    expect(getByText('در تماس')).toBeTruthy()
    expect(getByText('بازدید')).toBeTruthy()
    expect(getByText('مذاکره')).toBeTruthy()
    expect(getByText('تکمیل‌شده')).toBeTruthy()
    expect(getByText('لغوشده')).toBeTruthy()
  })

  it('calls onChange with the selected status', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<DealStatusPicker status="new" onChange={onChange} />)
    )

    fireEvent.press(getByLabelText('در تماس'))
    expect(onChange).toHaveBeenCalledWith('contacted')
  })

  it('marks the current status as selected', async () => {
    const { getByLabelText } = await render(
      withTheme(<DealStatusPicker status="viewing" onChange={jest.fn()} />)
    )

    expect(getByLabelText('بازدید').props.accessibilityState.selected).toBe(true)
    expect(getByLabelText('جدید').props.accessibilityState.selected).toBe(false)
  })
})
