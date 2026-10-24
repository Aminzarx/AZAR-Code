/**
 * Amin #5052/#5054: «کارنامهٔ توکن». The account's token ledger as the server keeps it (POST /tokens/ledger): the
 * balance (allowance + earned + bought − spent, never below zero) and every row with its date and reason. The last
 * answer is kept on the phone (encrypted device state) so the page also opens offline; changes not yet sent are
 * shown as waiting, the server books them when they arrive.
 */
export type TokenLedgerRow = { at: string; reason: string; amount: number }

export type TokenLedger = {
  summary: { balance: number; allowance: number; earned: number; bought: number; spent: number }
  rows: TokenLedgerRow[]
  settings: { tokensPerKb: number; phoneChangeTokens: number | null; packsOn: boolean }
}

export const TOKEN_REASON_LABELS: Record<string, string> = {
  allowance: 'توکن آغاز حساب',
  file_spend: 'ثبت یا بزرگ‌شدن فایل',
  file_refund: 'حذف یا کوچک‌شدن فایل',
  contract_spend: 'ثبت یا بزرگ‌شدن قرارداد',
  contract_refund: 'حذف یا کوچک‌شدن قرارداد',
  photo_spend: 'عکس تازه',
  photo_refund: 'حذف عکس',
  phone_change: 'تغییر شمارهٔ حساب',
  referral_bonus: 'هدیهٔ معرفی همکار',
  profile_bonus: 'هدیهٔ تکمیل پروفایل',
  pack_bought: 'خرید بستهٔ توکن'
}

export function tokenReasonLabel(reason: string): string {
  return TOKEN_REASON_LABELS[reason] ?? 'تغییر توکن'
}

/**
 * «۱۲٫۴»; under one token two decimals, so a small file still shows what it cost (۰٫۰۱, not ۰). Signed for the history:
 * the sign stays on the left of the number (LTR isolate), as everywhere in our Persian UI: +۶٬۳۵۰ / −۱٫۳
 */
export function formatTokenAmount(amount: number, signed = false): string {
  const abs = Math.abs(amount)
  const digits = abs < 1 ? 2 : 1
  const rounded = Math.round(abs * 10 ** digits) / 10 ** digits
  const text = rounded.toLocaleString('fa-IR', { maximumFractionDigits: digits })
  if (!signed || rounded === 0) return text
  return `⁦${amount > 0 ? '+' : '−'}${text}⁩`
}
