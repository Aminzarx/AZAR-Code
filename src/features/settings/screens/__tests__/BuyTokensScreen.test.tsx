import React from 'react'
import { AppState, Linking } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { BuyTokensScreen } from '../BuyTokensScreen'
import { PurchaseRefusedError } from '../../services/tokenPurchase'

const mockQuote = jest.fn()
const mockBuy = jest.fn()
const mockStatus = jest.fn()
const mockReceipts = jest.fn()
const mockApi = { quote: mockQuote, buy: mockBuy, status: mockStatus, receipts: mockReceipts }

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({ tokenPurchase: mockApi })
}))

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never
const route = (params?: { receipts?: boolean }) => ({ key: 'b', name: 'BuyTokens', params }) as never

const OPEN = { open: true, reason: null, unitToman: 50, minTokens: 1, maxTokens: 1000000, quote: null, sandbox: true }
const QUOTE = { tokens: 200, unitToman: 50, baseToman: 10000, vatToman: 1000, totalToman: 11000 }
const order = (over: Record<string, unknown> = {}) => ({
  id: 'tko_1',
  ...QUOTE,
  status: 'pending',
  refId: null,
  paidAt: null,
  createdAt: '2026-10-25T14:00:00.000Z',
  sandbox: true,
  ...over
})

describe('BuyTokensScreen (Amin #5245)', () => {
  let appStateListener: ((state: string) => void) | null = null

  beforeEach(() => {
    jest.useRealTimers()
    for (const m of [mockQuote, mockBuy, mockStatus, mockReceipts]) m.mockReset()
    mockReceipts.mockResolvedValue([])
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    ;(Linking.openURL as jest.Mock).mockClear()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (state: string) => void) => {
      appStateListener = fn
      return { remove: () => undefined }
    }) as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('says why buying is closed and offers no payment', async () => {
    mockQuote.mockResolvedValue({ ...OPEN, open: false, reason: 'price_unset', unitToman: null })
    const { findByText } = await render(withTheme(<BuyTokensScreen navigation={navigation} route={route()} />))
    expect(await findByText('قیمت توکن هنوز تعیین نشده است؛ به‌زودی خرید فعال می‌شود.')).toBeTruthy()
    fireEvent.press(await findByText('تأیید و پرداخت'))
    expect(mockBuy).not.toHaveBeenCalled()
  })

  it('shows the server price with VAT, opens the bank page, and shows the receipt once the payment is verified', async () => {
    mockQuote.mockImplementation((tokens?: number) => Promise.resolve(tokens ? { ...OPEN, quote: { ...QUOTE, tokens } } : OPEN))
    mockBuy.mockResolvedValue({ order: order(), payUrl: 'https://sandbox.zarinpal.com/pg/StartPay/A1' })
    const { findByText, findByLabelText, getByText } = await render(
      withTheme(<BuyTokensScreen navigation={navigation} route={route()} />)
    )
    expect(await findByText('قیمت هر توکن: ۵۰ تومان')).toBeTruthy()
    expect(getByText('پرداخت آزمایشی است؛ پولی جابه‌جا نمی‌شود.')).toBeTruthy()
    fireEvent.changeText(await findByLabelText('تعداد توکن'), '200')
    expect(await findByText('۱۱٬۰۰۰ تومان', {}, { timeout: 2000 })).toBeTruthy()
    expect(getByText('۱٬۰۰۰ تومان')).toBeTruthy()

    fireEvent.press(getByText('تأیید و پرداخت'))
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://sandbox.zarinpal.com/pg/StartPay/A1'))
    expect(mockBuy).toHaveBeenCalledWith(200, expect.stringMatching(/^buy-/))
    expect(await findByText('بررسی پرداخت')).toBeTruthy()

    // back from the bank: the app asks, the server says paid
    mockStatus.mockResolvedValue(order({ status: 'paid', refId: '98765', paidAt: '2026-10-25T14:05:00.000Z' }))
    mockReceipts.mockResolvedValue([])
    await act(async () => appStateListener?.('active'))
    expect(await findByText('۲۰۰ توکن به حساب شما اضافه شد')).toBeTruthy()
    expect(getByText('۹۸۷۶۵')).toBeTruthy()
    expect(mockStatus).toHaveBeenCalledWith('tko_1')
  })

  it('a refused order says why in words', async () => {
    mockQuote.mockImplementation((tokens?: number) => Promise.resolve(tokens ? { ...OPEN, quote: { ...QUOTE, tokens } } : OPEN))
    mockBuy.mockRejectedValue(new PurchaseRefusedError('payment_unavailable'))
    const { findByText, findByLabelText } = await render(withTheme(<BuyTokensScreen navigation={navigation} route={route()} />))
    fireEvent.changeText(await findByLabelText('تعداد توکن'), '200')
    await findByText('۱۱٬۰۰۰ تومان', {}, { timeout: 2000 })
    fireEvent.press(await findByText('تأیید و پرداخت'))
    expect(await findByText('درگاه پرداخت الان در دسترس نیست. کمی بعد دوباره امتحان کنید.')).toBeTruthy()
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('the receipts page lists earlier purchases without asking the price', async () => {
    mockReceipts.mockResolvedValue([order({ status: 'paid', refId: '555', paidAt: '2026-10-24T10:00:00.000Z' })])
    const { findByText, queryByText } = await render(
      withTheme(<BuyTokensScreen navigation={navigation} route={route({ receipts: true })} />)
    )
    expect(await findByText('۵۵۵')).toBeTruthy()
    expect(queryByText('تأیید و پرداخت')).toBeNull()
    expect(queryByText(/قیمت هر توکن/)).toBeNull()
  })
})
