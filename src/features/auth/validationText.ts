import type { ValidationFailureError } from '@core/auth/errors'

/**
 * The Persian line for each refusal the server can give. The server's own message is English and for logs only; it is
 * never shown (emulator test 2026-10-24: «That code is incorrect.» on the code screen).
 */
const TEXT: Record<ValidationFailureError['code'], string> = {
  invalid_phone_number: 'شمارهٔ موبایل درست نیست.',
  phone_already_registered: 'این شماره همین حالا حساب ایوان دارد.',
  invalid_otp: 'کد درست نیست. دوباره نگاه کنید.',
  otp_expired: 'زمان کد تمام شده است. کد تازه بگیرید.',
  invalid_referral_code: 'کد معرف درست نیست.',
  self_referral: 'کد معرف خودتان را نمی‌توانید وارد کنید.',
  phone_moved: 'این حساب به شمارهٔ دیگری منتقل شده است؛ با شمارهٔ تازه وارد شوید.',
  same_phone_number: 'این همان شمارهٔ فعلی شماست.',
  phone_change_off: 'تغییر شماره فعلاً فعال نیست.',
  tokens_short: 'توکن کافی ندارید.'
}

export function validationText(error: ValidationFailureError): string {
  return TEXT[error.code] ?? 'درخواست انجام نشد. دوباره تلاش کنید.'
}
