import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { QuickActions } from '../QuickActions'

describe('QuickActions', () => {
  it('renders each action and calls onPress', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <QuickActions actions={[{ id: 'add-property', label: 'افزودن پرونده ملکی', onPress }]} />
      )
    )

    fireEvent.press(getByLabelText('افزودن پرونده ملکی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
