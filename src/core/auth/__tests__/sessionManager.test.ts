import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../../infrastructure/database/migrationRunner'
import { SessionRepository } from '../../../infrastructure/database/repositories/SessionRepository'
import { UserRepository } from '../../../infrastructure/database/repositories/UserRepository'
import { ReferralRelationshipRepository } from '../../../infrastructure/database/repositories/ReferralRelationshipRepository'
import { MockAuthApiClient } from '../../../infrastructure/auth/mockAuthApiClient'
import { generateId, generateReferralCode } from '../../../infrastructure/auth/idGenerators'
import { inMemorySecureStorage } from '../../../infrastructure/security/testHelpers'
import { SessionManager } from '../sessionManager'
import type { AuthApiClient } from '../authApiClient'

const DEV_OTP_CODE = '555555'

async function setup() {
  const db: DB = open({ name: `test-session-${Math.random()}.db`, location: ':memory:' })
  db.executeSync('PRAGMA foreign_keys = ON')
  await runMigrations(db)

  const userRepository = new UserRepository(db)
  const referralRelationshipRepository = new ReferralRelationshipRepository(db)
  const sessionRepository = new SessionRepository(db)
  const authApiClient = new MockAuthApiClient(
    userRepository,
    referralRelationshipRepository,
    generateId,
    generateReferralCode
  )
  const secureStorage = inMemorySecureStorage()
  const sessionManager = new SessionManager(
    authApiClient,
    sessionRepository,
    secureStorage,
    generateId
  )

  const referrer = await userRepository.create({
    id: generateId(),
    phoneNumber: '+15550000000',
    referralCode: 'SEEDCODE'
  })

  return { db, sessionManager, authApiClient, sessionRepository, referrer }
}

describe('SessionManager', () => {
  it('returns null when no session has ever been established on this device', async () => {
    const { db, sessionManager } = await setup()
    expect(await sessionManager.getCurrentSession()).toBeNull()
    db.close()
  })

  it('persists a session after registration and restores it via getCurrentSession', async () => {
    const { db, sessionManager, authApiClient, referrer } = await setup()

    await authApiClient.sendOtp('+15551234567')
    await authApiClient.verifyOtp('+15551234567', DEV_OTP_CODE)
    const session = await sessionManager.register('+15551234567', referrer.referralCode)

    const restored = await sessionManager.getCurrentSession()
    expect(restored).toEqual(session)
    db.close()
  })

  it('persists a session after login and restores it via getCurrentSession', async () => {
    const { db, sessionManager, authApiClient, referrer } = await setup()

    await authApiClient.sendOtp(referrer.phoneNumber)
    await authApiClient.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)
    const session = await sessionManager.login(referrer.phoneNumber)

    const restored = await sessionManager.getCurrentSession()
    expect(restored?.userId).toBe(session.userId)
    expect(restored?.sessionToken).toBe(session.sessionToken)
    db.close()
  })

  it('clears the session on logout — getCurrentSession returns null afterward', async () => {
    const { db, sessionManager, authApiClient, referrer } = await setup()

    await authApiClient.sendOtp(referrer.phoneNumber)
    await authApiClient.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)
    await sessionManager.login(referrer.phoneNumber)

    await sessionManager.logout()

    expect(await sessionManager.getCurrentSession()).toBeNull()
    db.close()
  })

  it('marks the session revoked in the database on logout, not just in secure storage', async () => {
    const { db, sessionManager, authApiClient, sessionRepository, referrer } = await setup()

    await authApiClient.sendOtp(referrer.phoneNumber)
    await authApiClient.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)
    const session = await sessionManager.login(referrer.phoneNumber)

    await sessionManager.logout()

    const stored = await sessionRepository.findById(session.sessionId)
    expect(stored?.revokedAt).not.toBeNull()
    db.close()
  })

  it('does not restore a session whose database record was revoked out from under it', async () => {
    const { db, sessionManager, authApiClient, sessionRepository, referrer } = await setup()

    await authApiClient.sendOtp(referrer.phoneNumber)
    await authApiClient.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)
    const session = await sessionManager.login(referrer.phoneNumber)

    await sessionRepository.revoke(session.sessionId)

    expect(await sessionManager.getCurrentSession()).toBeNull()
    db.close()
  })

  // Unlike MockAuthApiClient (backed directly by the local repositories,
  // so the local `users` row already exists by the time register/login
  // returns), the real HttpAuthApiClient's user only exists on the remote
  // server — the local `users` row has to be created by the caller. Since
  // `sessions.user_id` references `users(id)` locally with foreign keys
  // enforced, persisting the session before that row exists throws.
  it('creates the local user row via onUserResolved before persisting the session', async () => {
    const db: DB = open({ name: `test-session-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)

    const userRepository = new UserRepository(db)
    const sessionRepository = new SessionRepository(db)
    const remoteUserId = generateId()
    const remoteAuthApiClient: AuthApiClient = {
      sendOtp: async () => {},
      verifyOtp: async () => {},
      register: async () => ({
        userId: remoteUserId,
        referralCode: 'REMOTE01',
        sessionToken: 'remote-session-token'
      }),
      login: async () => ({
        userId: remoteUserId,
        referralCode: 'REMOTE01',
        sessionToken: 'remote-session-token'
      }),
      deleteAccount: async () => {}
    }
    const sessionManager = new SessionManager(
      remoteAuthApiClient,
      sessionRepository,
      inMemorySecureStorage(),
      generateId
    )

    const session = await sessionManager.register('+15559999999', 'REMOTE01', async (resolved) => {
      await userRepository.create({
        id: resolved.userId,
        phoneNumber: '+15559999999',
        referralCode: resolved.referralCode
      })
    })

    expect(session.userId).toBe(remoteUserId)
    expect(await sessionRepository.findById(session.sessionId)).not.toBeNull()
    db.close()
  })

  it('throws instead of persisting a session for a user that was never cached locally', async () => {
    const db: DB = open({ name: `test-session-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)

    const sessionRepository = new SessionRepository(db)
    const remoteAuthApiClient: AuthApiClient = {
      sendOtp: async () => {},
      verifyOtp: async () => {},
      register: async () => ({
        userId: generateId(),
        referralCode: 'REMOTE02',
        sessionToken: 'remote-session-token'
      }),
      login: async () => {
        throw new Error('not used')
      },
      deleteAccount: async () => {}
    }
    const sessionManager = new SessionManager(
      remoteAuthApiClient,
      sessionRepository,
      inMemorySecureStorage(),
      generateId
    )

    await expect(sessionManager.register('+15559999998', 'REMOTE02')).rejects.toThrow()
    db.close()
  })
})
