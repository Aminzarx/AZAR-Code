import type { DB } from '@op-engineering/op-sqlite'
import { LinkedRecordsError, linkedMessage, linkedTo } from './linkedRecords'
import { likeAllTerms } from '../../../shared/utils/persianText'
import { parseBarterItems } from './PropertyRepository'

// Amin #5368: an applicant is found by name, phone, city, wanted deal and property kind, description and any budget
const APPLICANT_SEARCH_COLUMNS = [
  'full_name',
  'phone_number',
  'city',
  'region',
  'barter_items',
  'barter_other_description',
  'description',
  'applicant_type',
  'preferred_transaction_type',
  'preferred_property_type',
  'CAST(min_budget AS TEXT)',
  'CAST(max_budget AS TEXT)',
  'CAST(deposit_amount AS TEXT)',
  'CAST(rent_amount AS TEXT)'
] as const

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
  /** Amin #5416: the district, beside the city */
  region?: string | null
  /** Amin #5408: what a barter applicant offers (the barter file's categories) and the free text of «سایر» */
  barterItems?: string[]
  barterOtherDescription?: string | null
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
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
  /** Amin #5416: the district, beside the city */
  region?: string | null
  /** Amin #5408: what a barter applicant offers (the barter file's categories) and the free text of «سایر» */
  barterItems?: string[]
  barterOtherDescription?: string | null
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
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
  /** Amin #5416: the district, beside the city */
  region?: string | null
  /** Amin #5408: what a barter applicant offers (the barter file's categories) and the free text of «سایر» */
  barterItems?: string[]
  barterOtherDescription?: string | null
  minBudget: number | null
  maxBudget: number | null
  minArea: number | null
  maxArea: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
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
    region: (row.region as string | null) ?? null,
    barterItems: parseBarterItems(row.barter_items),
    barterOtherDescription: (row.barter_other_description as string | null) ?? null,
    minBudget: row.min_budget as number | null,
    maxBudget: row.max_budget as number | null,
    minArea: row.min_area as number | null,
    maxArea: row.max_area as number | null,
    rooms: row.rooms as number | null,
    depositAmount: row.deposit_amount as number | null,
    rentAmount: row.rent_amount as number | null,
    isConvertible: Boolean(row.is_convertible),
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
         preferred_property_type, city, region, barter_items, barter_other_description, min_budget, max_budget, min_area, max_area, rooms,
         deposit_amount, rent_amount, is_convertible, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
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
        applicant.region || null,
        applicant.barterItems && applicant.barterItems.length > 0
          ? JSON.stringify(applicant.barterItems)
          : null,
        applicant.barterOtherDescription || null,
        applicant.minBudget,
        applicant.maxBudget,
        applicant.minArea,
        applicant.maxArea,
        applicant.rooms,
        applicant.depositAmount,
        applicant.rentAmount,
        applicant.isConvertible ? 1 : 0,
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
   * design-system.md §7.2.2 — every word of `query` must match one of APPLICANT_SEARCH_COLUMNS (substring; budgets
   * are cast to text).
   */
  async search(userId: string, query: string): Promise<ApplicantRecord[]> {
    // Amin #5557: «۳ خوابه» is the wanted rooms; «۱۰۰ متری» falls in the wanted area range
    const match = likeAllTerms(APPLICANT_SEARCH_COLUMNS, query, {
      rooms: 'rooms',
      area: { min: 'min_area', max: 'max_area' }
    })
    if (!match.sql) {
      return this.getAll(userId)
    }
    const result = await this.db.execute(
      `SELECT * FROM applicants
       WHERE user_id = ? AND ${match.sql}
       ORDER BY created_at DESC, rowid DESC`,
      [userId, ...match.params]
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
           region = ?, barter_items = ?, barter_other_description = ?,
           min_budget = ?, max_budget = ?, min_area = ?, max_area = ?, rooms = ?,
           deposit_amount = ?, rent_amount = ?, is_convertible = ?,
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
        applicant.region || null,
        applicant.barterItems && applicant.barterItems.length > 0
          ? JSON.stringify(applicant.barterItems)
          : null,
        applicant.barterOtherDescription || null,
        applicant.minBudget,
        applicant.maxBudget,
        applicant.minArea,
        applicant.maxArea,
        applicant.rooms,
        applicant.depositAmount,
        applicant.rentAmount,
        applicant.isConvertible ? 1 : 0,
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

  /** #5716: what keeps it from being deleted (a contract, a deal, a reminder), as a sentence; null when nothing */
  async deletionBlocker(id: string): Promise<string | null> {
    const links = await linkedTo(this.db, 'applicant_id', id)
    return links ? linkedMessage('این متقاضی', links) : null
  }

  async delete(id: string): Promise<void> {
    const blocker = await this.deletionBlocker(id)
    if (blocker) throw new LinkedRecordsError(blocker)
    // Amin #5864: its reminders go with it; its contracts stay and keep its name
    const name = await this.db.execute('SELECT full_name FROM applicants WHERE id = ?', [id])
    await this.db.execute(
      'UPDATE contracts SET applicant_label = COALESCE(applicant_label, ?) WHERE applicant_id = ?',
      [(name.rows[0]?.full_name as string | undefined) ?? null, id] as never[]
    )
    await this.db.execute('DELETE FROM reminders WHERE applicant_id = ?', [id])
    await this.db.execute('DELETE FROM applicants WHERE id = ?', [id])
  }
}
