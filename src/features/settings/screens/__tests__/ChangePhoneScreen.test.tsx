import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ChangePhoneScreen } from '../ChangePhoneScreen'

const mockGetTokenLedger = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    changePhone: jest.fn(),
    getTokenLedger: mockGetTokenLedger
  })
}))

const navigationProp = { goBack: jest.fn() } as never
const routeProp = { key: 'ChangePhone', name: 'ChangePhone' as const, params: undefined }

function ledger(phoneChangeTokens: number | null, balance: number) {
  return {
    fresh: true,
    ledger: {
      summary: { balance, allowance: 6350, earned: 0, bought: 0, spent: 0 },
      settings: { tokensPerKb: 0.127, phoneChangeTokens, packsOn: false }
    }
  }
}

describe('ChangePhoneScreen token cost (Amin #5052)', () => {
  it('off while the cost is empty', async () => {
    mockGetTokenLedger.mockResolvedValue(ledger(null, 6350))
    await render(withTheme(<ChangePhoneScreen navigation={navigationProp} route={routeProp} />))
    expect(await screen.findByText('تغییر شماره فعلاً فعال نیست.')).toBeTruthy()
  })

  it('shows the cost and the balance', async () => {
    mockGetTokenLedger.mockResolvedValue(ledger(500, 6350))
    await render(withTheme(<ChangePhoneScreen navigation={navigationProp} route={routeProp} />))
    expect(await screen.findByText('هزینهٔ تغییر شماره: ۵۰۰ توکن (موجودی: ۶٬۳۵۰ توکن)')).toBeTruthy()
  })

  it('a short balance cannot start it', async () => {
    mockGetTokenLedger.mockResolvedValue(ledger(500, 120))
    await render(withTheme(<ChangePhoneScreen navigation={navigationProp} route={routeProp} />))
    expect(await screen.findByText(/کافی نیست/)).toBeTruthy()
  })

  it('offline: nothing shown, the server decides', async () => {
    mockGetTokenLedger.mockResolvedValue(null)
    await render(withTheme(<ChangePhoneScreen navigation={navigationProp} route={routeProp} />))
    expect(screen.queryByText(/توکن/)).toBeNull()
  })
})
