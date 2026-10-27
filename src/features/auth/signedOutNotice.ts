/**
 * Amin #5645: when another phone signs in with this number, this phone is signed out (one phone per account,
 * AZAR-SYNC-001). It looked like «leaving the app logs me out», so the start page now says why, once.
 */
let notice: string | null = null

export const SIGNED_IN_ELSEWHERE =
  'با این شماره روی گوشی دیگری وارد شده‌اید؛ برای همین از این گوشی خارج شدید. هر حساب در یک زمان فقط روی یک گوشی فعال است.'

export function setSignedOutNotice(text: string | null): void {
  notice = text
}

/** the notice, once: reading it clears it */
export function takeSignedOutNotice(): string | null {
  const text = notice
  notice = null
  return text
}
