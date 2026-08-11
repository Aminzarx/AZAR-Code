import type { AuthApiClient, LoginResult, RegisterResult } from '../../core/auth/authApiClient'
import {
  AuthenticationFailureError,
  NetworkFailureError,
  ValidationFailureError
} from '../../core/auth/errors'

type ErrorBody = { error?: { code?: string; message?: string } }

const VALIDATION_CODES = new Set([
  'invalid_phone_number',
  'phone_already_registered',
  'invalid_otp',
  'otp_expired',
  'invalid_referral_code',
  'self_referral'
])

/**
 * Talks to the real ADR-009 online surface (server/, deployed to the VPS
 * sandbox) over HTTPS. Every check (OTP correctness, referral validity,
 * self-referral, duplicate phone) is decided server-side; this class only
 * submits requests and translates the response into the same error
 * vocabulary MockAuthApiClient used, so nothing above AuthApiClient's
 * interface needs to change.
 *
 * OTP delivery is disabled by product decision (server/README.md) — the
 * server accepts any non-empty code at verify time. This class does not
 * know or care about that; it just forwards whatever the OTP screen
 * collected.
 */
export class HttpAuthApiClient implements AuthApiClient {
  constructor(private readonly baseUrl: string) {}

  async sendOtp(phoneNumber: string): Promise<void> {
    await this.post('/auth/send-otp', { phoneNumber })
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<void> {
    await this.post('/auth/verify-otp', { phoneNumber, code })
  }

  async register(phoneNumber: string, referralCode: string): Promise<RegisterResult> {
    return this.post('/auth/register', { phoneNumber, referralCode })
  }

  async login(phoneNumber: string): Promise<LoginResult> {
    return this.post('/auth/login', { phoneNumber })
  }

  async deleteAccount(phoneNumber: string): Promise<void> {
    await this.post('/auth/delete-account', { phoneNumber })
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      })
    } catch {
      throw new NetworkFailureError()
    }

    if (response.status === 204) {
      return undefined as T
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      parsed = null
    }

    if (response.ok) {
      return parsed as T
    }

    const errorBody = (parsed ?? {}) as ErrorBody
    const code = errorBody.error?.code
    const message = errorBody.error?.message ?? 'The request could not be completed.'

    if (response.status === 401) {
      throw new AuthenticationFailureError(message)
    }
    if (code && VALIDATION_CODES.has(code)) {
      throw new ValidationFailureError(message, code as ValidationFailureError['code'])
    }
    throw new NetworkFailureError()
  }
}
