import type { AuthApiClient } from './authApiClient'
import type { SessionRepository } from '../../infrastructure/database/repositories/SessionRepository'
import type { SecureStorage } from '../../infrastructure/security/secureStorage'

const SESSION_TOKEN_STORAGE_KEY = 'azar.session-token'

export type CurrentSession = {
  sessionId: string
  userId: string
  referralCode: string
  sessionToken: string
}

/**
 * Orchestrates session establishment and local persistence. The session
 * token lives in secure storage (same pattern as the database key,
 * databaseKey.ts) — never in plain app storage. Once established, using
 * the session is purely local (ADR-009 §"Once a session is established");
 * this class's only network-touching methods are register/login, both of
 * which delegate the actual network call to AuthApiClient.
 */
export class SessionManager {
  constructor(
    private readonly authApiClient: AuthApiClient,
    private readonly sessionRepository: SessionRepository,
    private readonly secureStorage: SecureStorage,
    private readonly generateId: () => string
  ) {}

  async register(phoneNumber: string, referralCode: string): Promise<CurrentSession> {
    const result = await this.authApiClient.register(phoneNumber, referralCode)
    return this.persistSession(result.userId, result.referralCode, result.sessionToken)
  }

  async login(phoneNumber: string): Promise<CurrentSession> {
    const result = await this.authApiClient.login(phoneNumber)
    return this.persistSession(result.userId, result.referralCode, result.sessionToken)
  }

  private async persistSession(
    userId: string,
    referralCode: string,
    sessionToken: string
  ): Promise<CurrentSession> {
    const session = await this.sessionRepository.create({ id: this.generateId(), userId })
    await this.secureStorage.set(SESSION_TOKEN_STORAGE_KEY, sessionToken)
    await this.secureStorage.set(`${SESSION_TOKEN_STORAGE_KEY}.session-id`, session.id)
    await this.secureStorage.set(`${SESSION_TOKEN_STORAGE_KEY}.user-id`, userId)
    await this.secureStorage.set(`${SESSION_TOKEN_STORAGE_KEY}.referral-code`, referralCode)
    return { sessionId: session.id, userId, referralCode, sessionToken }
  }

  /**
   * Restores a session from secure storage on app start, per AUTH-03's
   * "already-authenticated users continue offline" requirement — no
   * network call, no re-validation. Returns null if the user has never
   * registered/logged in on this device, or logged out.
   */
  async getCurrentSession(): Promise<CurrentSession | null> {
    const sessionToken = await this.secureStorage.get(SESSION_TOKEN_STORAGE_KEY)
    const sessionId = await this.secureStorage.get(`${SESSION_TOKEN_STORAGE_KEY}.session-id`)
    const userId = await this.secureStorage.get(`${SESSION_TOKEN_STORAGE_KEY}.user-id`)
    const referralCode = await this.secureStorage.get(`${SESSION_TOKEN_STORAGE_KEY}.referral-code`)

    if (!sessionToken || !sessionId || !userId || !referralCode) {
      return null
    }

    const session = await this.sessionRepository.findById(sessionId)
    if (!session || session.revokedAt) {
      return null
    }

    return { sessionId, userId, referralCode, sessionToken }
  }

  /**
   * Ends the local session. Never requires connectivity (AUTH-03) — this
   * only touches local state.
   */
  async logout(): Promise<void> {
    const sessionId = await this.secureStorage.get(`${SESSION_TOKEN_STORAGE_KEY}.session-id`)
    if (sessionId) {
      await this.sessionRepository.revoke(sessionId)
    }
    await this.secureStorage.delete(SESSION_TOKEN_STORAGE_KEY)
    await this.secureStorage.delete(`${SESSION_TOKEN_STORAGE_KEY}.session-id`)
    await this.secureStorage.delete(`${SESSION_TOKEN_STORAGE_KEY}.user-id`)
    await this.secureStorage.delete(`${SESSION_TOKEN_STORAGE_KEY}.referral-code`)
  }
}
