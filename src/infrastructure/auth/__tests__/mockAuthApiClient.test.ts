import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { UserRepository } from '../../database/repositories/UserRepository'
import { ReferralRelationshipRepository } from '../../database/repositories/ReferralRelationshipRepository'
import { MockAuthApiClient } from '../mockAuthApiClient'
import { generateId, generateReferralCode } from '../idGenerators'
import { AuthenticationFailureError, ValidationFailureError } from '../../../core/auth/errors'

const DEV_OTP_CODE = '555555'

async function setup() {
  const db: DB = open({ name: `test-auth-${Math.random()}.db`, location: ':memory:' })
  db.executeSync('PRAGMA foreign_keys = ON')
  await runMigrations(db)

  const userRepository = new UserRepository(db)
  const referralRelationshipRepository = new ReferralRelationshipRepository(db)
  const client = new MockAuthApiClient(
    userRepository,
    referralRelationshipRepository,
    generateId,
    generateReferralCode
  )

  return { db, userRepository, referralRelationshipRepository, client }
}

/** Registers a first "seed" user directly, to act as a referrer for other tests. */
async function seedReferrer(userRepository: UserRepository) {
  return userRepository.create({
    id: generateId(),
    phoneNumber: '+15550000000',
    referralCode: 'SEEDCODE'
  })
}

describe('MockAuthApiClient', () => {
  it('registers a new user given a valid referral code', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551234567')
    await client.verifyOtp('+15551234567', DEV_OTP_CODE)
    const result = await client.register('+15551234567', referrer.referralCode)

    expect(result.userId).toBeTruthy()
    expect(result.referralCode).toHaveLength(8)
    expect(result.referralCode).not.toBe(referrer.referralCode)

    const created = await userRepository.findByPhoneNumber('+15551234567')
    expect(created?.id).toBe(result.userId)
    db.close()
  })

  it('records the referral relationship on registration', async () => {
    const { db, userRepository, referralRelationshipRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551234567')
    await client.verifyOtp('+15551234567', DEV_OTP_CODE)
    const result = await client.register('+15551234567', referrer.referralCode)

    const relationship = await referralRelationshipRepository.findByReferredUserId(result.userId)
    expect(relationship?.referrerUserId).toBe(referrer.id)
    expect(await referralRelationshipRepository.countByReferrerUserId(referrer.id)).toBe(1)
    db.close()
  })

  it('generates a unique referral code for every new user', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551111111')
    await client.verifyOtp('+15551111111', DEV_OTP_CODE)
    const first = await client.register('+15551111111', referrer.referralCode)

    await client.sendOtp('+15552222222')
    await client.verifyOtp('+15552222222', DEV_OTP_CODE)
    const second = await client.register('+15552222222', referrer.referralCode)

    expect(first.referralCode).not.toBe(second.referralCode)
    db.close()
  })

  it('allows the same referral code to be used by multiple different registrants (ADR-009: reusable, referrer-of-many)', async () => {
    const { db, userRepository, referralRelationshipRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551111111')
    await client.verifyOtp('+15551111111', DEV_OTP_CODE)
    await client.register('+15551111111', referrer.referralCode)

    await client.sendOtp('+15552222222')
    await client.verifyOtp('+15552222222', DEV_OTP_CODE)
    await client.register('+15552222222', referrer.referralCode)

    expect(await referralRelationshipRepository.countByReferrerUserId(referrer.id)).toBe(2)
    db.close()
  })

  it('blocks self-referral', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp(referrer.phoneNumber)
    await client.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)

    await expect(client.register(referrer.phoneNumber, referrer.referralCode)).rejects.toThrow(
      ValidationFailureError
    )
    await expect(
      client.register(referrer.phoneNumber, referrer.referralCode)
    ).rejects.toMatchObject({ code: 'self_referral' })
    db.close()
  })

  it('rejects a referral code that does not exist', async () => {
    const { db, client } = await setup()

    await client.sendOtp('+15551234567')
    await client.verifyOtp('+15551234567', DEV_OTP_CODE)

    await expect(client.register('+15551234567', 'NOTREAL1')).rejects.toMatchObject({
      code: 'invalid_referral_code'
    })
    db.close()
  })

  it('rejects registration for an already-registered phone number', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551234567')
    await client.verifyOtp('+15551234567', DEV_OTP_CODE)
    await client.register('+15551234567', referrer.referralCode)

    await client.sendOtp('+15551234567')
    await client.verifyOtp('+15551234567', DEV_OTP_CODE)
    await expect(client.register('+15551234567', referrer.referralCode)).rejects.toMatchObject({
      code: 'phone_already_registered'
    })
    db.close()
  })

  it('rejects an incorrect OTP code', async () => {
    const { db, client } = await setup()
    await client.sendOtp('+15551234567')
    await expect(client.verifyOtp('+15551234567', '000000')).rejects.toMatchObject({
      code: 'invalid_otp'
    })
    db.close()
  })

  it('rejects registration if OTP was never verified', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp('+15551234567')
    await expect(client.register('+15551234567', referrer.referralCode)).rejects.toThrow(
      AuthenticationFailureError
    )
    db.close()
  })

  it('logs an existing user in after OTP verification', async () => {
    const { db, userRepository, client } = await setup()
    const referrer = await seedReferrer(userRepository)

    await client.sendOtp(referrer.phoneNumber)
    await client.verifyOtp(referrer.phoneNumber, DEV_OTP_CODE)
    const result = await client.login(referrer.phoneNumber)

    expect(result.userId).toBe(referrer.id)
    expect(result.referralCode).toBe(referrer.referralCode)
    db.close()
  })
})
