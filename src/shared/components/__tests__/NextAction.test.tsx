import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { NextAction } from '../NextAction'

describe('NextAction', () => {
  it('renders title, timestamp, and calls onAction when pressed', async () => {
    const onAction = jest.fn()
    const { getByText } = await render(
      withTheme(
        <NextAction
          title="تماس با محمد رضایی"
          timestamp="امروز · 14:30"
          actionLabel="پیگیری"
          onAction={onAction}
        />
      )
    )
    expect(getByText('تماس با محمد رضایی')).toBeTruthy()
    expect(getByText('امروز · 14:30')).toBeTruthy()
    fireEvent.press(getByText('پیگیری'))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
