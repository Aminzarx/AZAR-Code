import type { DB } from '@op-engineering/op-sqlite'

export type ApplicantStatus = 'active' | 'archived'

export type ApplicantRecord = {
  id: string
  userId: string
  fullName: string
  phoneNumber: string
  email: string | null
  applicantType: string | null
  preferredTransactionType: string | null
  preferredPropertyType: string | null
  city: string
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  description: string | null
  status: ApplicantStatus
  createdAt: string
  updatedAt: string
}

export type CreateApplicantRecord = {
  id: string
  userId: string
  fullName: string
  phoneNumber: string
  email: string | null
  applicantType: string | null
  preferredTransactionType: string | null
  preferredPropertyType: string | null
  city: string
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  description: string | null
}

export type UpdateApplicantRecord = {
  fullName: string
  phoneNumber: string
  email: string | null
  applicantType: string | null
  preferredTransactionType: string | null
  preferredPropertyType: string | null
  city: string
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  description: string | null
  status: ApplicantStatus
}

function toApplicant(row: Record<string, unknown>): ApplicantRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fullName: row.full_name as string,
    phoneNumber: row.phone_number as string,
    email: row.email as string | null,
    applicantType: row.applicant_type as string | null,
    preferredTransactionType: row.preferred_transaction_type as string | null,
    preferredPropertyType: row.preferred_property_type as string | null,
    city: row.city as string,
    minBudget: row.min_budget as number | null,
    maxBudget: row.max_budget as number | null,
    minArea: row.min_area as number | null,
    maxArea: row.max_area as number | null,
    rooms: row.rooms as number | null,
    description: row.description as string | null,
    status: row.status as ApplicantStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class ApplicantRepository {
  constructor(private readonly db: DB) {}

  async create(applicant: CreateApplicantRecord): Promise<ApplicantRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO applicants
        (id, user_id, full_name, phone_number, email, applicant_type, preferred_transaction_type,
         preferred_property_type, city, min_budget, max_budget, min_area, max_area, rooms,
         description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        applicant.id,
        applicant.userId,
        applicant.fullName,
        applicant.phoneNumber,
        applicant.email,
        applicant.applicantType,
        applicant.preferredTransactionType,
        applicant.preferredPropertyType,
        applicant.city,
        applicant.minBudget,
        applicant.maxBudget,
        applicant.minArea,
        applicant.maxArea,
        applicant.rooms,
        applicant.description,
        now,
        now
      ]
    )
    return {
      ...applicant,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  }

  async getById(id: string): Promise<ApplicantRecord | null> {
    const result = await this.db.execute('SELECT * FROM applicants WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toApplicant(row) : null
  }

  async getAll(userId: string): Promise<ApplicantRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM applicants WHERE user_id = ? ORDER BY created_at DESC, rowid DESC',
      [userId]
    )
    return result.rows.map(toApplicant)
  }

  /**
   * design-system.md §7.2.2 — matches against full name, city, phone
   * number, and budget (min/max, cast to text since they're stored as
   * plain-digit numbers) — simple substring.
   */
  async search(userId: string, query: string): Promise<ApplicantRecord[]> {
    const pattern = `%${query.trim()}%`
    const result = await this.db.execute(
      `SELECT * FROM applicants
       WHERE user_id = ? AND (
         full_name LIKE ? OR city LIKE ? OR phone_number LIKE ?
         OR CAST(min_budget AS TEXT) LIKE ? OR CAST(max_budget AS TEXT) LIKE ?
       )
       ORDER BY created_at DESC, rowid DESC`,
      [userId, pattern, pattern, pattern, pattern, pattern]
    )
    return result.rows.map(toApplicant)
  }

  async countByUser(userId: string): Promise<number> {
    const result = await this.db.execute(
      'SELECT COUNT(*) as count FROM applicants WHERE user_id = ?',
      [userId]
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async update(id: string, applicant: UpdateApplicantRecord): Promise<ApplicantRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE applicants
       SET full_name = ?, phone_number = ?, email = ?, applicant_type = ?,
           preferred_transaction_type = ?, preferred_property_type = ?, city = ?,
           min_budget = ?, max_budget = ?, min_area = ?, max_area = ?, rooms = ?,
           description = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        applicant.fullName,
        applicant.phoneNumber,
        applicant.email,
        applicant.applicantType,
        applicant.preferredTransactionType,
        applicant.preferredPropertyType,
        applicant.city,
        applicant.minBudget,
        applicant.maxBudget,
        applicant.minArea,
        applicant.maxArea,
        applicant.rooms,
        applicant.description,
        applicant.status,
        now,
        id
      ]
    )
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Applicant ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM applicants WHERE id = ?', [id])
  }
}
