import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { FormRow } from '../FormRow'

describe('FormRow', () => {
  it('renders all children', async () => {
    const { getByText } = await render(
      withTheme(
        <FormRow>
          <Text>حداقل قیمت</Text>
          <Text>حداکثر قیمت</Text>
        </FormRow>
      )
    )
    expect(getByText('حداقل قیمت')).toBeTruthy()
    expect(getByText('حداکثر قیمت')).toBeTruthy()
  })
})
