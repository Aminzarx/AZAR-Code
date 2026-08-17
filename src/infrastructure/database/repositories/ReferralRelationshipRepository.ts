import type { DB } from '@op-engineering/op-sqlite'

export type ReferralRelationshipRecord = {
  id: string
  referrerUserId: string
  referredUserId: string
  createdAt: string
}

function toRelationship(row: Record<string, unknown>): ReferralRelationshipRecord {
  return {
    id: row.id as string,
    referrerUserId: row.referrer_user_id as string,
    referredUserId: row.referred_user_id as string,
    createdAt: row.created_at as string
  }
}

/**
 * Write-once by design (ADR-009: immutable after registration). This
 * repository intentionally exposes no update/delete method — there is no
 * "change my referrer" operation anywhere in the codebase to call one.
 */
export class ReferralRelationshipRepository {
  constructor(private readonly db: DB) {}

  async create(relationship: {
    id: string
    referrerUserId: string
    referredUserId: string
  }): Promise<ReferralRelationshipRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO referral_relationships (id, referrer_user_id, referred_user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [relationship.id, relationship.referrerUserId, relationship.referredUserId, now]
    )
    return { ...relationship, createdAt: now }
  }

  async findByReferredUserId(referredUserId: string): Promise<ReferralRelationshipRecord | null> {
    const result = await this.db.execute(
      'SELECT * FROM referral_relationships WHERE referred_user_id = ?',
      [referredUserId]
    )
    const row = result.rows[0]
    return row ? toRelationship(row) : null
  }

  async countByReferrerUserId(referrerUserId: string): Promise<number> {
    const result = await this.db.execute(
      'SELECT COUNT(*) as count FROM referral_relationships WHERE referrer_user_id = ?',
      [referrerUserId]
    )
    return Number(result.rows[0]?.count ?? 0)
  }
}
