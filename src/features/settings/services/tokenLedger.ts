/**
 * Amin #5052/#5054, #5103/#5106: the account's tokens as the server keeps them (POST /tokens/ledger), shown on the
 * token card in Settings. The allowance is kss-pricing's value as it is now; tokens are counted only when a property
 * file, an applicant or a contract is saved, and on a number change (#5108). The last answer is kept on the phone
 * (encrypted device state) so the card also shows offline.
 */
export type TokenSummary = {
  balance: number
  allowance: number
  earned: number
  /** granted (Amin #6400): what support added — «افزودن ظرفیت», «پر کردن ظرفیت», «آزاد کردن ظرفیت» */
  earnedBy: { referral: number; profile: number; granted: number }
  bought: number
  spent: number
  spentBy: {
    files: number
    applicants: number
    contracts: number
    phoneChange: number
    /** Navid 2026-10-27: Divar posts read into new files */
    divarImport: number
    deducted: number
  }
  /** Amin #5351: what an invite earns (kss-pricing); null = no gift */
  referralBonus: number | null
}

export type TokenLedger = {
  summary: TokenSummary
  settings: { tokensPerKb: number; phoneChangeTokens: number | null; packsOn: boolean }
}

/** A copy kept from an older app version may miss the newer parts; they read as zero. */
export function normalizeSummary(summary: Partial<TokenSummary> | undefined): TokenSummary | null {
  if (!summary || typeof summary.balance !== 'number' || typeof summary.allowance !== 'number') return null
  return {
    balance: summary.balance,
    allowance: summary.allowance,
    earned: summary.earned ?? 0,
    earnedBy: { referral: summary.earnedBy?.referral ?? 0, profile: summary.earnedBy?.profile ?? 0, granted: summary.earnedBy?.granted ?? 0 },
    bought: summary.bought ?? 0,
    referralBonus: typeof summary.referralBonus === 'number' ? summary.referralBonus : null,
    spent: summary.spent ?? 0,
    spentBy: {
      files: summary.spentBy?.files ?? 0,
      applicants: summary.spentBy?.applicants ?? 0,
      contracts: summary.spentBy?.contracts ?? 0,
      phoneChange: summary.spentBy?.phoneChange ?? 0,
      divarImport: summary.spentBy?.divarImport ?? 0,
      // Amin #5243: taken off by support (billing «کسر ظرفیت», #6400), with the reason kept on the server
      deducted: summary.spentBy?.deducted ?? 0
    }
  }
}

/** Everything the account has had: allowance + gifts + bought. */
export function tokenTotal(summary: TokenSummary): number {
  return summary.allowance + summary.earned + summary.bought
}

/** 0…1 of the total used. */
export function usedShare(summary: TokenSummary): number {
  const total = tokenTotal(summary)
  if (total <= 0) return summary.spent > 0 ? 1 : 0
  return Math.min(1, Math.max(0, summary.spent / total))
}

/**
 * Amin #5103: the bar is green; yellow (a warning) once less than 30% is left, red once 95% is used.
 */
export function tokenLevel(share: number): 'ok' | 'warn' | 'danger' {
  if (share >= 0.95) return 'danger'
  if (share > 0.7) return 'warn'
  return 'ok'
}

/**
 * «۱۲٫۴»; under one token two decimals, so a small file still shows what it cost (۰٫۰۱, not ۰). Signed: the sign
 * stays on the left of the number (LTR isolate), as everywhere in our Persian UI: +۶٬۳۵۰ / −۱٫۳
 */
export function formatTokenAmount(amount: number, signed = false): string {
  const abs = Math.abs(amount)
  const digits = abs < 1 ? 2 : 1
  const rounded = Math.round(abs * 10 ** digits) / 10 ** digits
  const text = rounded.toLocaleString('fa-IR', { maximumFractionDigits: digits })
  if (!signed || rounded === 0) return text
  return `⁦${amount > 0 ? '+' : '−'}${text}⁩`
}
