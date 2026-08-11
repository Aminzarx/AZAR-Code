import {
  areTransactionTypesCompatible,
  citiesMatch,
  findApplicantMatchesForProperty,
  findPropertyMatchesForApplicant,
  scoreMatch
} from '../matchingService'
import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    ownerId: 'user-1',
    title: 'آپارتمان دو خوابه',
    propertyType: 'آپارتمان',
    transactionType: 'فروش',
    city: 'تهران',
    address: 'خیابان ولیعصر',
    price: 3000000000,
    area: 100,
    rooms: 2,
    depositAmount: null,
    rentAmount: null,
    isConvertible: false,
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    ...overrides
  }
}

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: 'app-1',
    userId: 'user-1',
    fullName: 'علی رضایی',
    phoneNumber: '09121234567',
    email: null,
    applicantType: null,
    preferredTransactionType: 'خرید',
    preferredPropertyType: 'آپارتمان',
    city: 'تهران',
    minBudget: 2000000000,
    maxBudget: 4000000000,
    minArea: 80,
    maxArea: 150,
    rooms: 2,
    depositAmount: null,
    rentAmount: null,
    isConvertible: false,
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    ...overrides
  }
}

describe('areTransactionTypesCompatible', () => {
  it('matches a "فروش" property against a "خرید" applicant (seller + buyer)', () => {
    expect(areTransactionTypesCompatible('فروش', 'خرید')).toBe(true)
  })

  it('does not match two "فروش" sides (seller + seller)', () => {
    expect(areTransactionTypesCompatible('فروش', 'فروش')).toBe(false)
  })

  it('does not match two "خرید" sides (buyer + buyer)', () => {
    expect(areTransactionTypesCompatible('خرید', 'خرید')).toBe(false)
  })

  it('matches a rental property against a tenant applicant', () => {
    expect(areTransactionTypesCompatible('اجاره', 'اجاره')).toBe(true)
    expect(areTransactionTypesCompatible('رهن و اجاره', 'اجاره')).toBe(true)
  })

  it('returns false when either side is empty', () => {
    expect(areTransactionTypesCompatible('', 'خرید')).toBe(false)
    expect(areTransactionTypesCompatible('فروش', null)).toBe(false)
  })
})

describe('citiesMatch', () => {
  it('matches identical cities', () => {
    expect(citiesMatch('تهران', 'تهران')).toBe(true)
  })

  it('matches cities differing only by Arabic/Persian Yeh and extra spaces', () => {
    expect(citiesMatch('   تهران  ', 'تهران')).toBe(true)
  })

  it('does not match different cities', () => {
    expect(citiesMatch('تهران', 'شیراز')).toBe(false)
  })
})

describe('scoreMatch', () => {
  it('scores 100 when every specified criterion matches (seller property + buyer applicant)', () => {
    const result = scoreMatch(makeProperty(), makeApplicant())
    expect(result?.score).toBe(100)
    expect(result?.matchedCriteria).toEqual(
      expect.arrayContaining(['city', 'propertyType', 'transactionType', 'budget', 'area', 'rooms'])
    )
  })

  it('returns null (no match) when cities differ', () => {
    const result = scoreMatch(makeProperty({ city: 'شیراز' }), makeApplicant({ city: 'تهران' }))
    expect(result).toBeNull()
  })

  it('only scores the city criterion when cities match but nothing else does', () => {
    const result = scoreMatch(
      makeProperty({
        propertyType: 'ویلایی',
        transactionType: 'رهن و اجاره',
        price: 100,
        area: 5
      }),
      makeApplicant({ rooms: 5 })
    )
    expect(result?.score).toBe(25)
    expect(result?.matchedCriteria).toEqual(['city'])
  })

  it('does not count budget/area toward the score when the applicant left them unset', () => {
    const result = scoreMatch(
      makeProperty(),
      makeApplicant({ minBudget: null, maxBudget: null, minArea: null, maxArea: null })
    )
    expect(result?.matchedCriteria).not.toContain('budget')
    expect(result?.matchedCriteria).not.toContain('area')
  })

  it('matches a price exactly at a budget boundary', () => {
    const result = scoreMatch(
      makeProperty({ price: 4000000000 }),
      makeApplicant({ minBudget: 2000000000, maxBudget: 4000000000 })
    )
    expect(result?.matchedCriteria).toContain('budget')
  })

  it('does not match a price outside the budget range', () => {
    const result = scoreMatch(
      makeProperty({ price: 5000000000 }),
      makeApplicant({ minBudget: 2000000000, maxBudget: 4000000000 })
    )
    expect(result?.matchedCriteria).not.toContain('budget')
  })
})

describe('findPropertyMatchesForApplicant', () => {
  it('sorts by score descending and drops zero-score/excluded properties', () => {
    const applicant = makeApplicant()
    const strongMatch = makeProperty({ id: 'prop-strong' })
    const weakMatch = makeProperty({
      id: 'prop-weak',
      propertyType: 'ویلایی',
      transactionType: 'رهن'
    })
    const differentCity = makeProperty({ id: 'prop-different-city', city: 'شیراز' })

    const results = findPropertyMatchesForApplicant(applicant, [
      weakMatch,
      differentCity,
      strongMatch
    ])

    expect(results.map((r) => r.property.id)).toEqual(['prop-strong', 'prop-weak'])
    expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0)
  })
})

describe('findApplicantMatchesForProperty', () => {
  it('sorts by score descending and drops zero-score/excluded applicants', () => {
    const property = makeProperty()
    const strongMatch = makeApplicant({ id: 'app-strong' })
    const differentCity = makeApplicant({ id: 'app-different-city', city: 'شیراز' })

    const results = findApplicantMatchesForProperty(property, [differentCity, strongMatch])

    expect(results.map((r) => r.applicant.id)).toEqual(['app-strong'])
  })
})
