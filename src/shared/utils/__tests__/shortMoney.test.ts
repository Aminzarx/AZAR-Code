import { moneyLine, relativeDay, shortAmount, shortToman, shortTomanRange } from '../shortMoney'

describe('shortMoney (v1.3.0 design batch 2)', () => {
  it('reads prices the way a broker says them', () => {
    expect(shortToman(8_500_000_000)).toBe('۸٫۵ میلیارد تومان')
    expect(shortAmount(45_000_000)).toBe('۴۵ میلیون')
    expect(shortAmount(2_000_000_000)).toBe('۲ میلیارد')
    expect(shortAmount(850_000)).toBe('۸۵۰ هزار')
    expect(shortAmount(900)).toBe('۹۰۰')
  })

  it('shares the scale word in a range when both ends use it', () => {
    expect(shortTomanRange(7_000_000_000, 9_000_000_000)).toBe('۷ تا ۹ میلیارد تومان')
    expect(shortTomanRange(800_000_000, 1_200_000_000)).toBe('۸۰۰ میلیون تا ۱٫۲ میلیارد تومان')
    expect(shortTomanRange(null, 9_000_000_000)).toBe('تا ۹ میلیارد تومان')
    expect(shortTomanRange(7_000_000_000, null)).toBe('از ۷ میلیارد تومان')
    expect(shortTomanRange(null, null)).toBeNull()
  })

  it('says how long ago in plain words', () => {
    const now = new Date(2026, 9, 23, 10, 0)
    expect(relativeDay(new Date(2026, 9, 23, 8, 0).toISOString(), now)).toBe('امروز')
    expect(relativeDay(new Date(2026, 9, 22, 23, 0).toISOString(), now)).toBe('دیروز')
    expect(relativeDay(new Date(2026, 9, 21).toISOString(), now)).toBe('۲ روز پیش')
    expect(relativeDay(new Date(2026, 9, 14).toISOString(), now)).toBe('هفتهٔ پیش')
    expect(relativeDay(new Date(2026, 9, 1).toISOString(), now)).toBe('۳ هفته پیش')
    expect(relativeDay(new Date(2026, 6, 20).toISOString(), now)).toBe('۳ ماه پیش')
  })
})

describe('moneyLine', () => {
  it('prefers the sale price, else the rental amounts', () => {
    expect(moneyLine(8_500_000_000, null, null)).toBe('۸٫۵ میلیارد تومان')
    expect(moneyLine(null, 2_000_000_000, 45_000_000)).toBe('رهن ۲ میلیارد · اجاره ۴۵ میلیون')
    expect(moneyLine(null, 3_000_000_000, 0)).toBe('رهن ۳ میلیارد')
    expect(moneyLine(null, null, null)).toBeNull()
  })
})
