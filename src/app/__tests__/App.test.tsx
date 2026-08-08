import React from 'react'
import { render } from '@testing-library/react-native'
import { App } from '../App'

describe('App', () => {
  it('renders the placeholder screen without crashing', async () => {
    const { getByText } = await render(<App />)
    expect(getByText('AZAR CRM')).toBeTruthy()
    expect(getByText('React Native foundation — Phase 5')).toBeTruthy()
  })
})
