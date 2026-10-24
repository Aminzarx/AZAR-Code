import { formatTokenAmount, tokenReasonLabel, TOKEN_REASON_LABELS } from '../tokenLedger'

describe('token ledger presentation (Amin #5052)', () => {
  it('every reason the server writes has a Persian label', () => {
    for (const reason of [
      'allowance', 'file_spend', 'file_refund', 'contract_spend', 'contract_refund', 'photo_spend',
      'photo_refund', 'phone_change', 'referral_bonus', 'profile_bonus', 'pack_bought'
    ]) {
      expect(TOKEN_REASON_LABELS[reason]).toBeTruthy()
    }
    expect(tokenReasonLabel('something_new')).toBe('تغییر توکن')
  })

  it('amounts in Persian digits, one decimal, signed in the history', () => {
    expect(formatTokenAmount(6350)).toBe('۶٬۳۵۰')
    expect(formatTokenAmount(-1.27, true)).toBe('−۱٫۳')
    expect(formatTokenAmount(10, true)).toBe('+۱۰')
    expect(formatTokenAmount(0, true)).toBe('۰')
  })
})
