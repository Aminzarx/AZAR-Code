import { extractCode } from '../smsCodeReader'

describe('extractCode (v1.2.0, Amin #4229)', () => {
  it('finds the 6-digit code in the Persian template text', () => {
    expect(extractCode('کد ورود شما به آزار: 246810\nلغو11', 6)).toBe('246810')
  })

  it('reads Persian and Arabic-Indic digits', () => {
    expect(extractCode('کد ورود: ۲۴۶۸۱۰', 6)).toBe('246810')
    expect(extractCode('رمز: ٢٤٦٨١٠', 6)).toBe('246810')
  })

  it('ignores longer numbers such as a phone number', () => {
    expect(extractCode('از 09121234567 — کد 135790', 6)).toBe('135790')
  })

  it('returns null when there is no code', () => {
    expect(extractCode('سلام', 6)).toBeNull()
  })
})
