import type { DB } from '@op-engineering/op-sqlite'

export type DealStatus = 'new' | 'contacted' | 'viewing' | 'negotiating' | 'completed' | 'cancelled'

export const DEAL_STATUSES: readonly DealStatus[] = [
  'new',
  'contacted',
  'viewing',
  'negotiating',
  'completed',
  'cancelled'
]

const ACTIVE_DEAL_STATUSES: readonly DealStatus[] = ['new', 'contacted', 'viewing', 'negotiating']

/**
 * crm-architecture-audit-v1.md §E.1 — the 9-stage pipeline replacing
 * `DealStatus` above. Both columns exist on `deals` right now
 * (migration 0010): `status` stays untouched so the existing
 * DealStatusPicker UI keeps working unmodified, `currentStage` is the
 * new pipeline field new code should read/write going forward.
 */
export type DealStage =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'visit_scheduled'
  | 'visited'
  | 'negotiation'
  | 'offer'
  | 'contract'
  | 'won'
  | 'lost'

export const DEAL_STAGES: readonly DealStage[] = [
  'new',
  'contacted',
  'interested',
  'visit_scheduled',
  'visited',
  'negotiation',
  'offer',
  'contract',
  'won',
  'lost'
]

export type DealStageHistoryRecord = {
  id: string
  dealId: string
  fromStage: DealStage | null
  toStage: DealStage
  actorUserId: string
  note: string | null
  changedAt: string
}

export type DealRecord = {
  id: string
  userId: string
  propertyId: string
  applicantId: string
  status: DealStatus
  currentStage: DealStage
  lostReasonId: string | null
  expectedValue: number | null
  nextAction: string | null
  nextActionDueAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreateDealRecord = {
  id: string
  userId: string
  propertyId: string
  applicantId: string
}

function toDeal(row: Record<string, unknown>): DealRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    propertyId: row.property_id as string,
    applicantId: row.applicant_id as string,
    status: row.status as DealStatus,
    currentStage: (row.current_stage as DealStage | null) ?? 'new',
    lostReasonId: row.lost_reason_id as string | null,
    expectedValue: row.expected_value as number | null,
    nextAction: row.next_action as string | null,
    nextActionDueAt: row.next_action_due_at as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

function toDealStageHistory(row: Record<string, unknown>): DealStageHistoryRecord {
  return {
    id: row.id as string,
    dealId: row.deal_id as string,
    fromStage: row.from_stage as DealStage | null,
    toStage: row.to_stage as DealStage,
    actorUserId: row.actor_user_id as string,
    note: row.note as string | null,
    changedAt: row.changed_at as string
  }
}

export class DealRepository {
  constructor(private readonly db: DB) {}

  async create(deal: CreateDealRecord): Promise<DealRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO deals
        (id, user_id, property_id, applicant_id, status, current_stage, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'new', 'new', NULL, ?, ?)`,
      [deal.id, deal.userId, deal.propertyId, deal.applicantId, now, now]
    )
    return {
      ...deal,
      status: 'new',
      currentStage: 'new',
      lostReasonId: null,
      expectedValue: null,
      nextAction: null,
      nextActionDueAt: null,
      notes: null,
      createdAt: now,
      updatedAt: now
    }
  }

  async getById(id: string): Promise<DealRecord | null> {
    const result = await this.db.execute('SELECT * FROM deals WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toDeal(row) : null
  }

  async getAll(userId: string): Promise<DealRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM deals WHERE user_id = ? ORDER BY created_at DESC, rowid DESC',
      [userId]
    )
    return result.rows.map(toDeal)
  }

  async getByProperty(propertyId: string): Promise<DealRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM deals WHERE property_id = ? ORDER BY created_at DESC, rowid DESC',
      [propertyId]
    )
    return result.rows.map(toDeal)
  }

  async getByApplicant(applicantId: string): Promise<DealRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM deals WHERE applicant_id = ? ORDER BY created_at DESC, rowid DESC',
      [applicantId]
    )
    return result.rows.map(toDeal)
  }

  async countActive(userId: string): Promise<number> {
    const placeholders = ACTIVE_DEAL_STATUSES.map(() => '?').join(', ')
    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM deals WHERE user_id = ? AND status IN (${placeholders})`,
      [userId, ...ACTIVE_DEAL_STATUSES]
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  /** Counts deals grouped by `current_stage`, for the Dashboard Pipeline section. */
  async countByStage(userId: string): Promise<Record<DealStage, number>> {
    const result = await this.db.execute(
      `SELECT current_stage, COUNT(*) as count FROM deals WHERE user_id = ? GROUP BY current_stage`,
      [userId]
    )
    const counts = Object.fromEntries(DEAL_STAGES.map((stage) => [stage, 0])) as Record<
      DealStage,
      number
    >
    for (const row of result.rows) {
      const stage = row.current_stage as DealStage | null
      if (stage && stage in counts) {
        counts[stage] = Number(row.count ?? 0)
      }
    }
    return counts
  }

  async updateStatus(id: string, status: DealStatus): Promise<DealRecord> {
    const now = new Date().toISOString()
    await this.db.execute('UPDATE deals SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      now,
      id
    ])
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Deal ${id} not found after update`)
    }
    return updated
  }

  /**
   * Moves a deal to a new pipeline stage and records the transition —
   * crm-architecture-audit-v1.md §C.7. `lostReasonId` is only persisted
   * when `toStage === 'lost'`; BR-004 (a lost deal must have a reason) is
   * enforced by the service layer, not here.
   */
  async transitionStage(
    id: string,
    toStage: DealStage,
    actorUserId: string,
    options?: { note?: string | null; lostReasonId?: string | null }
  ): Promise<DealRecord> {
    const current = await this.getById(id)
    if (!current) {
      throw new Error(`Deal ${id} not found`)
    }
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE deals SET current_stage = ?, lost_reason_id = ?, updated_at = ? WHERE id = ?`,
      [toStage, toStage === 'lost' ? (options?.lostReasonId ?? null) : null, now, id]
    )
    // `now` alone can collide across two transitions inside the same
    // millisecond (e.g. back-to-back calls in a test) — a random suffix
    // keeps the primary key unique without needing a generateId
    // dependency injected into this repository.
    const historyId = `${id}-stage-${now}-${Math.random().toString(36).slice(2, 8)}`
    await this.db.execute(
      `INSERT INTO deal_stage_history (id, deal_id, from_stage, to_stage, actor_user_id, note, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [historyId, id, current.currentStage, toStage, actorUserId, options?.note ?? null, now]
    )
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Deal ${id} not found after stage transition`)
    }
    return updated
  }

  async getStageHistory(dealId: string): Promise<DealStageHistoryRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM deal_stage_history WHERE deal_id = ? ORDER BY changed_at ASC, rowid ASC',
      [dealId]
    )
    return result.rows.map(toDealStageHistory)
  }

  async updateExpectedValue(id: string, expectedValue: number | null): Promise<DealRecord> {
    const now = new Date().toISOString()
    await this.db.execute('UPDATE deals SET expected_value = ?, updated_at = ? WHERE id = ?', [
      expectedValue,
      now,
      id
    ])
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Deal ${id} not found after update`)
    }
    return updated
  }

  async updateNotes(id: string, notes: string | null): Promise<DealRecord> {
    const now = new Date().toISOString()
    await this.db.execute('UPDATE deals SET notes = ?, updated_at = ? WHERE id = ?', [
      notes,
      now,
      id
    ])
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Deal ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM deals WHERE id = ?', [id])
  }
}
