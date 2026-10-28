import React from 'react'
import { Text } from 'react-native'
import { act, render } from '@testing-library/react-native'
import { normalizeSummary } from '../tokenLedger'
import { noteTokenSummary, resetTokenBlock, takeTokenNotice, withTokens } from '../tokenBlock'

let resolveLedger: (value: unknown) => void = () => undefined
const mockGetTokenLedger = jest.fn(
  () =>
    new Promise((resolve) => {
      resolveLedger = resolve
    })
)
const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({ getTokenLedger: mockGetTokenLedger, sync: { state: 'idle' } })
}))
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => false })
}))
jest.mock('@navigation/crossTabNavigate', () => ({
  navigateAcrossTabs: (...args: unknown[]) => mockNavigate(...args)
}))

const Form = withTokens(() => <Text>form</Text>)
const ledger = (spent: number) => ({ ledger: { summary: { balance: 100 - spent, allowance: 100, spent } } })

describe('withTokens (Amin #5975: no white page before the form)', () => {
  beforeEach(() => {
    resetTokenBlock()
    takeTokenNotice()
    mockNavigate.mockReset()
    mockGetTokenLedger.mockClear()
  })

  it('draws the form at once, before the token check answers', async () => {
    const { getByText } = await render(<Form />)
    expect(getByText('form')).toBeTruthy()
    expect(mockGetTokenLedger).toHaveBeenCalledTimes(1)
    await act(async () => resolveLedger(ledger(10)))
    expect(getByText('form')).toBeTruthy()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('leaves for «تنظیمات» when the check finds the tokens spent', async () => {
    const { queryByText } = await render(<Form />)
    await act(async () => resolveLedger(ledger(99)))
    expect(queryByText('form')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith(expect.anything(), 'Settings', undefined)
    expect(takeTokenNotice()).toBeTruthy()
  })

  it('does not draw the form when the kept answer is already «spent»', async () => {
    noteTokenSummary(normalizeSummary({ balance: 1, allowance: 100, spent: 99 }))
    const { queryByText } = await render(<Form />)
    expect(queryByText('form')).toBeNull()
    expect(mockNavigate).toHaveBeenCalled()
  })
})
