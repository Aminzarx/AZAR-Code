/**
 * NETWORK FAILURE vs AUTHENTICATION FAILURE (ADR-008) — never conflated.
 * Only AuthenticationFailureError ever ends a session or blocks a retry
 * permanently; NetworkFailureError means "unknown, try again," never
 * "revoked."
 */
export class NetworkFailureError extends Error {
  constructor(message = 'This action requires an internet connection.') {
    super(message)
    this.name = 'NetworkFailureError'
  }
}

export class AuthenticationFailureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationFailureError'
  }
}

/** A request the server understood and explicitly rejected (bad input, not a network/auth problem). */
export class ValidationFailureError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_phone_number'
      | 'phone_already_registered'
      | 'invalid_otp'
      | 'otp_expired'
      | 'invalid_referral_code'
      | 'self_referral'
  ) {
    super(message)
    this.name = 'ValidationFailureError'
  }
}
