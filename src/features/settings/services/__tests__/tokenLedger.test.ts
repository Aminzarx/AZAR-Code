import { formatTokenAmount, normalizeSummary, tokenLevel, usedShare } from '../tokenLedger'

describe('token card presentation (Amin #5103)', () => {
  it('green, yellow once more than 70% is used, red from 95%', () => {
    expect(tokenLevel(0.5)).toBe('ok')
    expect(tokenLevel(0.7)).toBe('ok')
    expect(tokenLevel(0.71)).toBe('warn')
    expect(tokenLevel(0.95)).toBe('danger')
  })

  it('a copy kept by an older version reads the missing parts as zero', () => {
    const summary = normalizeSummary({ balance: 2530, allowance: 2540, earned: 0, bought: 0, spent: 10 })
    expect(summary?.spentBy.files).toBe(0)
    expect(summary && usedShare(summary)).toBeCloseTo(10 / 2540)
    expect(normalizeSummary(undefined)).toBeNull()
  })

  it('amounts in Persian digits, one decimal (two under one), sign on the left', () => {
    expect(formatTokenAmount(6350)).toBe('۶٬۳۵۰')
    expect(formatTokenAmount(-1.27, true)).toBe('⁦−۱٫۳⁩')
    expect(formatTokenAmount(10, true)).toBe('⁦+۱۰⁩')
    expect(formatTokenAmount(-0.0127, true)).toBe('⁦−۰٫۰۱⁩')
    expect(formatTokenAmount(0, true)).toBe('۰')
  })
})
