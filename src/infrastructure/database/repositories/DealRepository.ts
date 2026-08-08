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

export type DealRecord = {
  id: string
  userId: string
  propertyId: string
  applicantId: string
  status: DealStatus
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
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class DealRepository {
  constructor(private readonly db: DB) {}

  async create(deal: CreateDealRecord): Promise<DealRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO deals (id, user_id, property_id, applicant_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'new', NULL, ?, ?)`,
      [deal.id, deal.userId, deal.propertyId, deal.applicantId, now, now]
    )
    return {
      ...deal,
      status: 'new',
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
