import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { FormScreenContainer } from '../FormScreenContainer'

describe('FormScreenContainer', () => {
  it('renders its children inside the scrollable, keyboard-aware layout', async () => {
    const { getByText } = await render(
      withTheme(
        <FormScreenContainer>
          <Text>محتوای فرم</Text>
        </FormScreenContainer>
      )
    )
    expect(getByText('محتوای فرم')).toBeTruthy()
  })
})
