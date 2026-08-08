import React from 'react'
import { render } from '@testing-library/react-native'
import { Avatar } from '../Avatar'
import { withTheme } from '../testHelpers'

describe('Avatar', () => {
  it('renders initials from a two-word name', async () => {
    const { getByText } = await render(withTheme(<Avatar name="سارا احمدی" />))
    expect(getByText('سا')).toBeTruthy()
  })

  it('renders a single initial for a one-word name', async () => {
    const { getByText } = await render(withTheme(<Avatar name="سارا" />))
    expect(getByText('س')).toBeTruthy()
  })

  it('falls back to "?" for an empty name', async () => {
    const { getByText } = await render(withTheme(<Avatar name="" />))
    expect(getByText('?')).toBeTruthy()
  })
})
