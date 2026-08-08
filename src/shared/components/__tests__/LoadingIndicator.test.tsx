import React from 'react'
import { render } from '@testing-library/react-native'
import { LoadingIndicator } from '../LoadingIndicator'
import { withTheme } from '../testHelpers'

describe('LoadingIndicator', () => {
  it('renders the indeterminate variant without crashing', async () => {
    const { toJSON } = await render(withTheme(<LoadingIndicator />))
    expect(toJSON()).toBeTruthy()
  })

  it('exposes a progressbar accessibility role for the determinate variant', async () => {
    const { getByRole } = await render(
      withTheme(<LoadingIndicator variant="determinate" progress={0.5} />)
    )
    expect(getByRole('progressbar')).toBeTruthy()
  })

  it('clamps out-of-range progress values', async () => {
    const { getByRole } = await render(
      withTheme(<LoadingIndicator variant="determinate" progress={2} />)
    )
    expect(getByRole('progressbar').props.accessibilityValue.now).toBe(100)
  })
})
