/**
 * Amin #5245: buying tokens in the app. The server (azar-auth purchaseRoutes.js) prices the order from kss-pricing,
 * billing takes the payment at the gateway and verifies it, and only then are the tokens added. The app never decides
 * a price: it shows the server's quote, opens the gateway page and asks the order's status when it comes back.
 */
import { formatTokenAmount } from './tokenLedger'

export type PurchaseQuote = {
  tokens: number
  unitToman: number
  baseToman: number
  vatToman: number
  totalToman: number
}

/** POST /tokens/purchase/quote */
export type PurchaseOffer = {
  open: boolean
  /** why buying is closed: price_unset, vat_unset, sales_off, not_yet */
  reason: string | null
  unitToman: number | null
  minTokens: number
  maxTokens: number
  quote: PurchaseQuote | null
  sandbox: boolean
}

export type TokenOrder = PurchaseQuote & {
  id: string
  status: 'pending' | 'paid' | 'failed' | 'expired'
  /** the bank's tracking number, once paid */
  refId: string | null
  paidAt: string | null
  createdAt: string
  sandbox: boolean
}

/** The server refused a purchase step with a known code (closed, invalid amount, payment could not start). */
export class PurchaseRefusedError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'PurchaseRefusedError'
  }
}

/** Plain words for why buying is not possible now. */
export function closedReasonText(reason: string | null): string {
  switch (reason) {
    case 'not_yet':
      return 'خرید توکن وقتی باز می‌شود که ۹۵٪ توکن‌ها مصرف شده باشد.'
    case 'price_unset':
    case 'vat_unset':
      return 'قیمت توکن هنوز تعیین نشده است؛ به‌زودی خرید فعال می‌شود.'
    case 'sales_off':
      return 'خرید توکن هنوز برای همه فعال نشده است.'
    case 'invalid_tokens':
      return 'تعداد توکن را به عدد درست وارد کنید.'
    case 'payment_unavailable':
      return 'درگاه پرداخت الان در دسترس نیست. کمی بعد دوباره امتحان کنید.'
    default:
      return 'به اینترنت وصل نیستید یا سرور پاسخ نداد. دوباره تلاش کنید.'
  }
}

/** «۱۲٬۵۰۰ تومان» */
export function formatToman(amount: number): string {
  return `${Math.round(amount).toLocaleString('fa-IR')} تومان`
}

/** «۲۰۰ توکن» */
export function formatTokens(count: number): string {
  return `${formatTokenAmount(count)} توکن`
}

/** A key for one buying attempt: the same key is sent again on a retry, so one tap never makes two orders. */
export function newPurchaseKey(): string {
  return `buy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
