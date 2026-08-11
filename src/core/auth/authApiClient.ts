/**
 * The entire online surface of the app (ADR-009): registration, OTP,
 * referral validation, session establishment. The client's role is
 * strictly "submit a request, display the result" — every check here
 * (OTP correctness, referral validity, self-referral, duplicate phone)
 * is authoritatively decided by whatever implements this interface, not
 * by the caller. See mockAuthApiClient.ts for the current, stub
 * implementation (ADR-003: no real OTP/SMS provider is selected yet).
 */
export type RegisterResult = {
  userId: string
  referralCode: string
  sessionToken: string
}

export type LoginResult = {
  userId: string
  referralCode: string
  sessionToken: string
}

export type AuthApiClient = {
  sendOtp(phoneNumber: string): Promise<void>
  verifyOtp(phoneNumber: string, code: string): Promise<void>
  register(phoneNumber: string, referralCode: string): Promise<RegisterResult>
  login(phoneNumber: string): Promise<LoginResult>
  /** Requires the same fresh OTP-verified state as register/login — see server/README.md. */
  deleteAccount(phoneNumber: string): Promise<void>
}
