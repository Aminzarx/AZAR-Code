import type { DB } from '@op-engineering/op-sqlite'

export type ContractStatus = 'active' | 'completed' | 'cancelled'

export const CONTRACT_STATUSES: readonly ContractStatus[] = ['active', 'completed', 'cancelled']

export type ContractRecord = {
  id: string
  userId: string
  propertyId: string
  applicantId: string
  dealId: string | null
  type: string | null
  status: ContractStatus
  amount: number | null
  startDate: string
  endDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreateContractRecord = {
  id: string
  userId: string
  propertyId: string
  applicantId: string
  dealId: string | null
  type: string | null
  amount: number | null
  startDate: string
  endDate: string
  notes: string | null
}

export type UpdateContractRecord = {
  type: string | null
  status: ContractStatus
  amount: number | null
  startDate: string
  endDate: string
  notes: string | null
}

function toContract(row: Record<string, unknown>): ContractRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    propertyId: row.property_id as string,
    applicantId: row.applicant_id as string,
    dealId: row.deal_id as string | null,
    type: row.type as string | null,
    status: row.status as ContractStatus,
    amount: row.amount as number | null,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class ContractRepository {
  constructor(private readonly db: DB) {}

  async create(contract: CreateContractRecord): Promise<ContractRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO contracts
        (id, user_id, property_id, applicant_id, deal_id, type, status, amount, start_date, end_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        contract.id,
        contract.userId,
        contract.propertyId,
        contract.applicantId,
        contract.dealId,
        contract.type,
        contract.amount,
        contract.startDate,
        contract.endDate,
        contract.notes,
        now,
        now
      ]
    )
    return {
      ...contract,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  }

  async getById(id: string): Promise<ContractRecord | null> {
    const result = await this.db.execute('SELECT * FROM contracts WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toContract(row) : null
  }

  async getAll(userId: string): Promise<ContractRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM contracts WHERE user_id = ? ORDER BY created_at DESC, rowid DESC',
      [userId]
    )
    return result.rows.map(toContract)
  }

  async getByStatus(userId: string, status: ContractStatus): Promise<ContractRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM contracts WHERE user_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC',
      [userId, status]
    )
    return result.rows.map(toContract)
  }

  async countActive(userId: string): Promise<number> {
    const result = await this.db.execute(
      "SELECT COUNT(*) as count FROM contracts WHERE user_id = ? AND status = 'active'",
      [userId]
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async update(id: string, contract: UpdateContractRecord): Promise<ContractRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE contracts
       SET type = ?, status = ?, amount = ?, start_date = ?, end_date = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        contract.type,
        contract.status,
        contract.amount,
        contract.startDate,
        contract.endDate,
        contract.notes,
        now,
        id
      ]
    )
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Contract ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM contracts WHERE id = ?', [id])
  }
}
