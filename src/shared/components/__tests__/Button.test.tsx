import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { Button } from '../Button'
import { withTheme } from '../testHelpers'

describe('Button', () => {
  it('renders its label', async () => {
    const { getByText } = await render(withTheme(<Button label="ادامه" onPress={() => {}} />))
    expect(getByText('ادامه')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(withTheme(<Button label="ادامه" onPress={onPress} />))
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(
      withTheme(<Button label="ادامه" onPress={onPress} disabled />)
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows a loading indicator instead of the label while loading', async () => {
    const { queryByText } = await render(
      withTheme(<Button label="ادامه" onPress={() => {}} loading />)
    )
    expect(queryByText('ادامه')).toBeNull()
  })

  it('marks the accessibility role as a button', async () => {
    const { getByRole } = await render(withTheme(<Button label="ادامه" onPress={() => {}} />))
    expect(getByRole('button')).toBeTruthy()
  })
})
