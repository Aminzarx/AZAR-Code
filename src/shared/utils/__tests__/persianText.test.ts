import {
  findClosestMatch,
  levenshteinDistance,
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
