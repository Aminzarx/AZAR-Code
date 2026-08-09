import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { SegmentedControl } from '../SegmentedControl'

const OPTIONS = [
  { value: 'properties', label: 'املاک' },
  { value: 'applicants', label: 'متقاضیان' }
] as const

describe('SegmentedControl', () => {
  it('renders every option label', async () => {
    const { getByText } = await render(
      withTheme(<SegmentedControl options={OPTIONS} value="properties" onChange={jest.fn()} />)
    )

    expect(getByText('املاک')).toBeTruthy()
    expect(getByText('متقاضیان')).toBeTruthy()
  })

  it('marks the current value as selected', async () => {
    const { getByLabelText } = await render(
      withTheme(<SegmentedControl options={OPTIONS} value="applicants" onChange={jest.fn()} />)
    )

    expect(getByLabelText('متقاضیان').props.accessibilityState.selected).toBe(true)
    expect(getByLabelText('املاک').props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the pressed option value', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<SegmentedControl options={OPTIONS} value="properties" onChange={onChange} />)
    )

    fireEvent.press(getByLabelText('متقاضیان'))
    expect(onChange).toHaveBeenCalledWith('applicants')
  })
})
