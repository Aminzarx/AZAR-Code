import type { AuthApiClient, LoginResult, RegisterResult } from '../../core/auth/authApiClient'
import { AuthenticationFailureError, ValidationFailureError } from '../../core/auth/errors'
import type { UserRepository } from '../database/repositories/UserRepository'
import type { ReferralRelationshipRepository } from '../database/repositories/ReferralRelationshipRepository'

/**
 * Stand-in for the real backend (ADR-003: no OTP/SMS provider is selected
 * yet; ADR-009's five-operation online surface has no server to call
 * against). Per authentication-otp-architecture.md: "Local testing/
 * development environments will need a stub/mock OTP path (e.g. a fixed
 * test code in non-production builds)" — this is exactly that stub,
 * backed by the local repositories instead of a network call so the
 * registration/login flow is genuinely testable end-to-end before a real
 * backend exists. Replace this whole file when one does; nothing outside
 * it should need to change, since callers only depend on AuthApiClient.
 *
 * OTP/referral state normally lives entirely server-side (never
 * self-reported by the client) — here that just means "in this class,"
 * not "in the local database or on the device otherwise."
 */
const DEV_OTP_CODE = '123456'
const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes — illustrative default, ADR-009 §"Open items"

type OtpState = {
  code: string
  expiresAt: number
  verified: boolean
}

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/

export class MockAuthApiClient implements AuthApiClient {
  private readonly otpState = new Map<string, OtpState>()

  constructor(
    private readonly userRepository: UserRepository,
    private readonly referralRelationshipRepository: ReferralRelationshipRepository,
    private readonly generateId: () => string,
    private readonly generateReferralCode: () => string
  ) {}

  async sendOtp(phoneNumber: string): Promise<void> {
    if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
      throw new ValidationFailureError('Enter a valid phone number.', 'invalid_phone_number')
    }
    this.otpState.set(phoneNumber, {
      code: DEV_OTP_CODE,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      verified: false
    })
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<void> {
    const state = this.otpState.get(phoneNumber)
    if (!state) {
      throw new ValidationFailureError('Request a new verification code first.', 'invalid_otp')
    }
    if (Date.now() > state.expiresAt) {
      throw new ValidationFailureError('This code has expired. Request a new one.', 'otp_expired')
    }
    if (state.code !== code) {
      throw new ValidationFailureError('That code is incorrect.', 'invalid_otp')
    }
    state.verified = true
  }

  async register(phoneNumber: string, referralCode: string): Promise<RegisterResult> {
    const state = this.otpState.get(phoneNumber)
    if (!state?.verified) {
      throw new AuthenticationFailureError('Verify your phone number before registering.')
    }

    const referrer = await this.userRepository.findByReferralCode(referralCode)
    if (!referrer) {
      throw new ValidationFailureError('This referral code was not found.', 'invalid_referral_code')
    }

    // Checked before the duplicate-phone check below: the one scenario
    // where a referral code resolves to the registering phone's own
    // existing account is exactly self-referral (REF-04), and should
    // surface as that specific, distinct error rather than the generic
    // "already registered" one, per REF-04's explicit requirement.
    if (referrer.phoneNumber === phoneNumber) {
      throw new ValidationFailureError('You cannot use your own referral code.', 'self_referral')
    }

    const existing = await this.userRepository.findByPhoneNumber(phoneNumber)
    if (existing) {
      throw new ValidationFailureError(
        'This phone number is already registered. Log in instead.',
        'phone_already_registered'
      )
    }

    const user = await this.userRepository.create({
      id: this.generateId(),
      phoneNumber,
      referralCode: this.generateReferralCode()
    })
    await this.referralRelationshipRepository.create({
      id: this.generateId(),
      referrerUserId: referrer.id,
      referredUserId: user.id
    })

    this.otpState.delete(phoneNumber)

    return {
      userId: user.id,
      referralCode: user.referralCode,
      sessionToken: this.generateId()
    }
  }

  async login(phoneNumber: string): Promise<LoginResult> {
    const state = this.otpState.get(phoneNumber)
    if (!state?.verified) {
      throw new AuthenticationFailureError('Verify your phone number before logging in.')
    }

    const user = await this.userRepository.findByPhoneNumber(phoneNumber)
    if (!user) {
      throw new ValidationFailureError('No account found for this number.', 'invalid_phone_number')
    }

    this.otpState.delete(phoneNumber)

    return {
      userId: user.id,
      referralCode: user.referralCode,
      sessionToken: this.generateId()
    }
  }
}
