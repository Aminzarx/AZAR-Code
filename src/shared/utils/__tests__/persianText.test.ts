import {
  findClosestMatch,
  levenshteinDistance,
  normalizePersianText,
  suggestMatches
} from '../persianText'

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
