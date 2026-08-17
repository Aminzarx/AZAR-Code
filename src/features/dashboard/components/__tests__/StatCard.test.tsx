import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  it('renders the stat value and label', async () => {
    const { getByLabelText } = await render(
      withTheme(<StatCard stat={{ id: 'properties', label: 'پرونده‌های ملکی', value: '3' }} />)
    )

    expect(getByLabelText('پرونده‌های ملکی: 3')).toBeTruthy()
  })
})
