import { joinDealKinds, kindForApplicant, parseDealKinds } from '../dealKinds'

describe('dealKinds (Amin #5240)', () => {
  it('reads one or several kinds in a fixed order, old single values included', () => {
    expect(parseDealKinds('فروش')).toEqual(['فروش'])
    expect(parseDealKinds('تهاتر، فروش')).toEqual(['فروش', 'تهاتر'])
    expect(parseDealKinds('فروش، رهن و اجاره، تهاتر')).toEqual(['فروش', 'رهن و اجاره', 'تهاتر'])
    expect(parseDealKinds('اجاره')).toEqual(['رهن و اجاره'])
    expect(parseDealKinds('رهن')).toEqual(['رهن و اجاره'])
    expect(parseDealKinds('')).toEqual([])
    expect(parseDealKinds(null)).toEqual([])
    expect(parseDealKinds('پیش‌فروش')).toEqual([])
  })

  it('stores the kinds joined in their fixed order, without repeats', () => {
    expect(joinDealKinds(['تهاتر', 'فروش'])).toBe('فروش، تهاتر')
    expect(joinDealKinds(['رهن و اجاره', 'رهن و اجاره'])).toBe('رهن و اجاره')
    expect(joinDealKinds([])).toBe('')
  })

  it('maps what an applicant wants to the kind of file that serves it', () => {
    expect(kindForApplicant('خرید')).toBe('فروش')
    expect(kindForApplicant('اجاره')).toBe('رهن و اجاره')
    expect(kindForApplicant('رهن و اجاره')).toBe('رهن و اجاره')
    expect(kindForApplicant('تهاتر')).toBe('تهاتر')
    expect(kindForApplicant('')).toBeNull()
    expect(kindForApplicant('سرمایه‌گذاری')).toBeNull()
  })
})
