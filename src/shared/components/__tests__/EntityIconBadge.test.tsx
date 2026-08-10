import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { EntityIconBadge } from '../EntityIconBadge'

describe('EntityIconBadge', () => {
  it('renders without crashing for both tones', async () => {
    const { toJSON: secondaryTree } = await render(
      withTheme(<EntityIconBadge icon="files" tone="secondary" />)
    )
    expect(secondaryTree()).toBeTruthy()

    const { toJSON: tertiaryTree } = await render(
      withTheme(<EntityIconBadge icon="person" tone="tertiary" />)
    )
    expect(tertiaryTree()).toBeTruthy()
  })
})
