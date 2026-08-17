import React from 'react'
import { render } from '@testing-library/react-native'
import { TextInput } from '../TextInput'
import { withTheme } from '../testHelpers'

describe('RTL behavior', () => {
  it('right-aligns TextInput text when isRTL is true (default)', async () => {
    const { getByLabelText } = await render(
      withTheme(<TextInput label="نام" value="" onChangeText={() => {}} />, true)
    )
    expect(getByLabelText('نام').props.textAlign).toBe('right')
  })

  it('left-aligns TextInput text when isRTL is false', async () => {
    const { getByLabelText } = await render(
      withTheme(<TextInput label="Name" value="" onChangeText={() => {}} />, false)
    )
    expect(getByLabelText('Name').props.textAlign).toBe('left')
  })
})
