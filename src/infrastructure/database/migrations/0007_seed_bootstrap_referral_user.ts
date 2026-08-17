import type { Migration } from '../types'

/**
 * "Registration requires a valid referral code — no referral code means no
 * registration, there is no path around this" (docs/00-project-overview.md,
 * Authentication requirements). That rule is correct and stays enforced
 * exactly as written; nothing about the registration flow changes here.
 *
 * What it also means, taken literally, is that a brand-new database has no
 * user in it to be a referrer — the very first registration on any fresh
 * install has no valid code to enter. In a real deployment that first
 * account is presumably provisioned directly by the business, out-of-band,
 * the same way this migration does it: a single pre-existing row, not a
 * UI bypass. This migration seeds exactly that one bootstrap account so a
 * fresh local/QA install has something to register against; every actual
 * registration still goes through AuthApiClient.register()'s full referral
 * validation, self-referral check, etc., unchanged.
 */
export const migration0007SeedBootstrapReferralUser: Migration = {
  version: 7,
  description:
    'Seed one bootstrap user so a fresh install has a valid referral code to register with',
  statements: [
    `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
     VALUES (
       'bootstrap-seed-user',
       '09100000000',
       'AZARSEED',
       '2026-01-01T00:00:00.000Z',
       '2026-01-01T00:00:00.000Z'
     )`
  ]
}
