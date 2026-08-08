import React from 'react'
import { render } from '@testing-library/react-native'
import { PlaceholderScreen } from '../PlaceholderScreen'

describe('PlaceholderScreen', () => {
  it('renders its title and subtitle', async () => {
    const { getByText } = await render(<PlaceholderScreen />)
    expect(getByText('AZAR CRM')).toBeTruthy()
    expect(getByText('React Native foundation — Phase 5')).toBeTruthy()
  })
})
