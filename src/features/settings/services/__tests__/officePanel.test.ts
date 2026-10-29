import { linkCodeOf, officeErrorText } from '../officePanel'
import { OfficeRefusedError } from '@infrastructure/sync/syncApiClient'

jest.mock('@infrastructure/database/connection', () => ({ getDatabase: jest.fn() }))

describe('officePanel (Amin #6033)', () => {
  it('reads the code from the QR link, a typed code with a space, or Persian digits', () => {
    expect(linkCodeOf('eyvan://office-link?c=12345678')).toBe('12345678')
    expect(linkCodeOf('1234 5678')).toBe('12345678')
    expect(linkCodeOf('۱۲۳۴۵۶۷۸')).toBe('12345678')
    expect(linkCodeOf('1234567')).toBeNull()
    expect(linkCodeOf('https://example.com/?x=12345678')).toBeNull()
  })

  it("says the server's own Persian sentence when it refused", () => {
    expect(officeErrorText(new OfficeRefusedError('link_expired', 'کد منقضی شد'))).toBe('کد منقضی شد')
    expect(officeErrorText(new Error('x'))).toContain('اینترنت')
  })
})
