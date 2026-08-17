import type { DB } from '@op-engineering/op-sqlite'

export type LostReasonRecord = {
  id: string
  label: string
  isSystemDefault: boolean
  createdAt: string
}

function toLostReason(row: Record<string, unknown>): LostReasonRecord {
  return {
    id: row.id as string,
    label: row.label as string,
    isSystemDefault: Boolean(row.is_system_default),
    createdAt: row.created_at as string
  }
}

/** Read-mostly — the 7 default reasons are seeded by migration 0010; this repository lets custom ones be added later without a schema change. */
export class LostReasonRepository {
  constructor(private readonly db: DB) {}

  async getAll(): Promise<LostReasonRecord[]> {
    const result = await this.db.execute('SELECT * FROM lost_reasons ORDER BY created_at ASC')
    return result.rows.map(toLostReason)
  }

  async getById(id: string): Promise<LostReasonRecord | null> {
    const result = await this.db.execute('SELECT * FROM lost_reasons WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toLostReason(row) : null
  }
}
