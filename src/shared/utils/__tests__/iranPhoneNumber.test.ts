import { canonicalizeIranPhoneNumber, formatIranPhoneNumberForDisplay } from '../iranPhoneNumber'

describe('canonicalizeIranPhoneNumber', () => {
  it('converts a local-format number to canonical', () => {
    expect(canonicalizeIranPhoneNumber('09121234567')).toBe('+989121234567')
  })

  it('accepts an already-canonical number unchanged', () => {
    expect(canonicalizeIranPhoneNumber('+989121234567')).toBe('+989121234567')
  })

  it('tolerates spaces and dashes', () => {
    expect(canonicalizeIranPhoneNumber('0912 123 4567')).toBe('+989121234567')
    expect(canonicalizeIranPhoneNumber('0912-123-4567')).toBe('+989121234567')
  })

  it('rejects a too-short number', () => {
    expect(canonicalizeIranPhoneNumber('0912123')).toBeNull()
  })

  it('rejects a non-Iranian-mobile format', () => {
    expect(canonicalizeIranPhoneNumber('02112345678')).toBeNull()
    expect(canonicalizeIranPhoneNumber('+15551234567')).toBeNull()
  })
})

describe('formatIranPhoneNumberForDisplay', () => {
  it('converts canonical to local display', () => {
    expect(formatIranPhoneNumberForDisplay('+989121234567')).toBe('09121234567')
  })
})
