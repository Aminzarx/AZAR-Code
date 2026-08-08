import {
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
    preferredTransactionType: 'فروش',
    preferredPropertyType: 'آپارتمان',
    city: 'تهران',
    minBudget: 2000000000,
    maxBudget: 4000000000,
    minArea: 80,
    maxArea: 150,
    rooms: 2,
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    ...overrides
  }
}

describe('scoreMatch', () => {
  it('scores 100 when every specified criterion matches', () => {
    const result = scoreMatch(makeProperty(), makeApplicant())
    expect(result.score).toBe(100)
    expect(result.matchedCriteria).toEqual(
      expect.arrayContaining(['city', 'propertyType', 'transactionType', 'budget', 'area', 'rooms'])
    )
  })

  it('scores 0 when nothing matches', () => {
    const result = scoreMatch(
      makeProperty({
        city: 'شیراز',
        propertyType: 'ویلا',
        transactionType: 'رهن و اجاره',
        price: 100,
        area: 5
      }),
      makeApplicant({ city: 'تهران', rooms: 5 })
    )
    expect(result.score).toBe(0)
    expect(result.matchedCriteria).toEqual([])
  })

  it('does not count budget/area toward the score when the applicant left them unset', () => {
    const result = scoreMatch(
      makeProperty(),
      makeApplicant({ minBudget: null, maxBudget: null, minArea: null, maxArea: null })
    )
    expect(result.matchedCriteria).not.toContain('budget')
    expect(result.matchedCriteria).not.toContain('area')
  })

  it('matches a price exactly at a budget boundary', () => {
    const result = scoreMatch(
      makeProperty({ price: 4000000000 }),
      makeApplicant({ minBudget: 2000000000, maxBudget: 4000000000 })
    )
    expect(result.matchedCriteria).toContain('budget')
  })

  it('does not match a price outside the budget range', () => {
    const result = scoreMatch(
      makeProperty({ price: 5000000000 }),
      makeApplicant({ minBudget: 2000000000, maxBudget: 4000000000 })
    )
    expect(result.matchedCriteria).not.toContain('budget')
  })
})

describe('findPropertyMatchesForApplicant', () => {
  it('sorts by score descending and drops zero-score properties', () => {
    const applicant = makeApplicant()
    const strongMatch = makeProperty({ id: 'prop-strong' })
    const weakMatch = makeProperty({
      id: 'prop-weak',
      propertyType: 'ویلا',
      transactionType: 'رهن'
    })
    const noMatch = makeProperty({
      id: 'prop-none',
      city: 'شیراز',
      propertyType: 'زمین',
      transactionType: 'رهن و اجاره',
      price: 1,
      area: 5,
      rooms: 9
    })

    const results = findPropertyMatchesForApplicant(applicant, [weakMatch, noMatch, strongMatch])

    expect(results.map((r) => r.property.id)).toEqual(['prop-strong', 'prop-weak'])
    expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0)
  })
})

describe('findApplicantMatchesForProperty', () => {
  it('sorts by score descending and drops zero-score applicants', () => {
    const property = makeProperty()
    const strongMatch = makeApplicant({ id: 'app-strong' })
    const noMatch = makeApplicant({
      id: 'app-none',
      city: 'شیراز',
      preferredPropertyType: 'زمین',
      preferredTransactionType: 'رهن',
      rooms: 9,
      minBudget: 1,
      maxBudget: 10,
      minArea: 1,
      maxArea: 5
    })

    const results = findApplicantMatchesForProperty(property, [noMatch, strongMatch])

    expect(results.map((r) => r.applicant.id)).toEqual(['app-strong'])
  })
})
