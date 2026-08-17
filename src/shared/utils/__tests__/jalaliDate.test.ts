import {
  parseJalaliDate,
  formatJalaliDate,
  jalaliToGregorianIso,
  gregorianIsoToJalali,
  daysInJalaliMonth,
  isLeapJalaliYear
} from '../jalaliDate'

describe('parseJalaliDate', () => {
  it('treats single- and double-digit month/day as the same date', () => {
    expect(parseJalaliDate('1405/5/12')).toEqual({ year: 1405, month: 5, day: 12 })
    expect(parseJalaliDate('1405/05/12')).toEqual({ year: 1405, month: 5, day: 12 })
  })

  it('accepts Persian digits identically to English digits', () => {
    expect(parseJalaliDate('۱۴۰۵/۵/۱۲')).toEqual({ year: 1405, month: 5, day: 12 })
  })

  it('accepts -, /, and . as separators', () => {
    expect(parseJalaliDate('1405-05-12')).toEqual({ year: 1405, month: 5, day: 12 })
    expect(parseJalaliDate('1405.05.12')).toEqual({ year: 1405, month: 5, day: 12 })
  })

  it('rejects an impossible calendar date (e.g. Esfand 30 in a common year)', () => {
    expect(parseJalaliDate('1404/12/30')).toBeNull()
  })

  it('accepts Esfand 30 in a leap year', () => {
    expect(parseJalaliDate('1403/12/30')).toEqual({ year: 1403, month: 12, day: 30 })
  })

  it('rejects malformed input', () => {
    expect(parseJalaliDate('not a date')).toBeNull()
    expect(parseJalaliDate('1405/13/01')).toBeNull()
    expect(parseJalaliDate('')).toBeNull()
  })
})

describe('formatJalaliDate', () => {
  it('zero-pads month and day', () => {
    expect(formatJalaliDate({ year: 1405, month: 5, day: 2 })).toBe('1405/05/02')
  })
})

describe('jalaliToGregorianIso / gregorianIsoToJalali', () => {
  it('round-trips correctly', () => {
    const jalali = { year: 1400, month: 4, day: 30 }
    const iso = jalaliToGregorianIso(jalali)
    expect(iso).toBe('2021-07-21')
    expect(gregorianIsoToJalali(iso)).toEqual(jalali)
  })

  it('returns null for a malformed ISO string', () => {
    expect(gregorianIsoToJalali('not-a-date')).toBeNull()
  })
})

describe('daysInJalaliMonth / isLeapJalaliYear', () => {
  it('reports 29 or 30 days for Esfand depending on leap year', () => {
    expect(daysInJalaliMonth(1404, 12)).toBe(29)
    expect(daysInJalaliMonth(1403, 12)).toBe(30)
    expect(isLeapJalaliYear(1403)).toBe(true)
    expect(isLeapJalaliYear(1404)).toBe(false)
  })

  it('reports 31 days for the first 6 months', () => {
    expect(daysInJalaliMonth(1405, 1)).toBe(31)
  })
})
