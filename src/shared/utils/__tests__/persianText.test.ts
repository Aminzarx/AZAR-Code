import {
  findClosestMatch,
  formatSearchNumbers,
  levenshteinDistance,
  likeAllTerms,
  parseSearch,
  searchTerms,
  normalizePersianText,
  suggestMatches,
  toEnglishDigits
} from '../persianText'

describe('toEnglishDigits', () => {
  it('converts Persian digits to ASCII', () => {
    expect(toEnglishDigits('۱۴۰۵/۰۵/۱۲')).toBe('1405/05/12')
  })

  it('converts Arabic-Indic digits to ASCII', () => {
    expect(toEnglishDigits('١٤٠٥/٠٥/١٢')).toBe('1405/05/12')
  })

  it('leaves ASCII digits and non-digit characters untouched', () => {
    expect(toEnglishDigits('1405/05/12')).toBe('1405/05/12')
  })

  it('handles a mix of Persian and English digits in the same string', () => {
    expect(toEnglishDigits('14۰5/۰5/12')).toBe('1405/05/12')
  })
})

describe('normalizePersianText', () => {
  it('unifies Arabic and Persian Yeh/Kaf', () => {
    expect(normalizePersianText('كتاب')).toBe(normalizePersianText('کتاب'))
    expect(normalizePersianText('علي')).toBe(normalizePersianText('علی'))
  })

  it('collapses extra whitespace and trims', () => {
    expect(normalizePersianText('  تهران   بزرگ  ')).toBe('تهران بزرگ')
  })

  it('treats ZWNJ as a regular space', () => {
    expect(normalizePersianText('می‌خواهم')).toBe(normalizePersianText('می خواهم'))
  })
})

describe('levenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    expect(levenshteinDistance('آپارتمان', 'آپارتمان')).toBe(0)
  })

  it('counts a single substitution as distance 1', () => {
    expect(levenshteinDistance('آبارتمان', 'آپارتمان')).toBe(1)
  })
})

describe('findClosestMatch', () => {
  it('corrects a common typo to the closest known option', () => {
    expect(findClosestMatch('آبارتمان', ['آپارتمان', 'ویلایی', 'زمین'])).toBe('آپارتمان')
  })

  it('returns null when nothing is close enough', () => {
    expect(findClosestMatch('اتوبوس', ['آپارتمان', 'ویلایی', 'زمین'])).toBeNull()
  })
})

describe('suggestMatches', () => {
  it('ranks prefix matches before fuzzy matches', () => {
    const result = suggestMatches('نیش', ['نیشابور', 'اصفهان', 'نیشاپور'])
    expect(result[0]).toBe('نیشابور')
  })

  it('returns all candidates when input is empty', () => {
    expect(suggestMatches('', ['تهران', 'مشهد'])).toEqual(['تهران', 'مشهد'])
  })
})

describe('searchTerms (Amin #5368)', () => {
  it('splits words, makes digits ASCII and drops thousands separators', () => {
    expect(searchTerms(' فروش  ۱٬۵۰۰,۰۰۰ ')).toEqual(['فروش', '1500000'])
  })

  it('builds one OR group per word', () => {
    expect(likeAllTerms(['a', 'b'], 'x y')).toEqual({
      sql: '(a LIKE ? OR b LIKE ?) AND (a LIKE ? OR b LIKE ?)',
      params: ['%x%', '%x%', '%y%', '%y%'],
    })
  })
})

describe('formatSearchNumbers (Amin #5368)', () => {
  it('groups only numbers longer than five digits, never a phone number', () => {
    expect(formatSearchNumbers('فروش 1500000')).toBe('فروش ۱٬۵۰۰٬۰۰۰')
    expect(formatSearchNumbers('۱۲۰۰۰')).toBe('۱۲۰۰۰')
    expect(formatSearchNumbers('۱۲٬۰۰۰')).toBe('۱۲۰۰۰')
    expect(formatSearchNumbers('09121234567')).toBe('09121234567')
  })
})

describe('parseSearch (Amin #5557)', () => {
  it('reads «N خوابه» as rooms and «N متری» as area, in any digits and spacing', () => {
    expect(parseSearch('۳ خوابه ونک')).toEqual({ terms: ['ونک'], rooms: 3, area: null })
    expect(parseSearch('3خوابه')).toEqual({ terms: [], rooms: 3, area: null })
    expect(parseSearch('٢ اتاق ۱۲۰متری')).toEqual({ terms: [], rooms: 2, area: 120 })
    expect(parseSearch('كرج 500')).toEqual({ terms: ['کرج', '500'], rooms: null, area: null })
  })

  it('turns rooms and area into their own conditions', () => {
    expect(likeAllTerms(['a'], '3 خوابه x', { rooms: 'r', area: 'ar' })).toEqual({
      sql: '(a LIKE ?) AND r = ?',
      params: ['%x%', 3]
    })
    expect(likeAllTerms(['a'], '100 متری', { area: { min: 'mn', max: 'mx' } })).toEqual({
      sql: '(COALESCE(mn, 0) <= ? AND COALESCE(mx, 1e12) >= ?)',
      params: [100, 100]
    })
  })
})
