import React from 'react'
import { render } from '@testing-library/react-native'
import { StatusBadge } from '../StatusBadge'
import { withTheme } from '../testHelpers'

describe('StatusBadge', () => {
  it('renders its label', async () => {
    const { getByText } = await render(withTheme(<StatusBadge label="فعال" tone="positive" />))
    expect(getByText('فعال')).toBeTruthy()
  })

  it.each(['positive', 'attention', 'inProgress', 'highlight', 'neutral'] as const)(
    'renders the %s tone without crashing',
    async (tone) => {
      const { getByText } = await render(withTheme(<StatusBadge label="نمونه" tone={tone} />))
      expect(getByText('نمونه')).toBeTruthy()
    }
  )
})
