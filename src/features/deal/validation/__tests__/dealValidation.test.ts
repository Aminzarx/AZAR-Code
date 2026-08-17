import { isValidDealStatus, normalizeDealNotes } from '../dealValidation'

describe('isValidDealStatus', () => {
  it('accepts every known status', () => {
    expect(isValidDealStatus('new')).toBe(true)
    expect(isValidDealStatus('contacted')).toBe(true)
    expect(isValidDealStatus('viewing')).toBe(true)
    expect(isValidDealStatus('negotiating')).toBe(true)
    expect(isValidDealStatus('completed')).toBe(true)
    expect(isValidDealStatus('cancelled')).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(isValidDealStatus('archived')).toBe(false)
    expect(isValidDealStatus('')).toBe(false)
  })
})

describe('normalizeDealNotes', () => {
  it('trims whitespace', () => {
    expect(normalizeDealNotes('  یادداشت  ')).toBe('یادداشت')
  })

  it('converts empty/whitespace-only text to null', () => {
    expect(normalizeDealNotes('')).toBeNull()
    expect(normalizeDealNotes('   ')).toBeNull()
  })
})
