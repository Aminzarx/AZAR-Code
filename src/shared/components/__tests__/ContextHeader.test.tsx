import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { ContextHeader } from '../ContextHeader'

describe('ContextHeader', () => {
  it('renders only the primary entity when no secondary is given', async () => {
    const { getByText, queryByText } = await render(
      withTheme(<ContextHeader primary="آپارتمان ولیعصر" />)
    )
    expect(getByText('آپارتمان ولیعصر')).toBeTruthy()
    expect(queryByText('محمد رضایی')).toBeNull()
  })

  it('renders both entities when a secondary is given', async () => {
    const { getByText } = await render(
      withTheme(<ContextHeader primary="آپارتمان ولیعصر" secondary="محمد رضایی" />)
    )
    expect(getByText('آپارتمان ولیعصر')).toBeTruthy()
    expect(getByText('محمد رضایی')).toBeTruthy()
  })
})
