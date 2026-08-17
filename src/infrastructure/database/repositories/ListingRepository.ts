import type { DB } from '@op-engineering/op-sqlite'

export type ListingTransactionType = 'sale' | 'rent' | 'rent_and_deposit'
export type ListingStatus = 'draft' | 'active' | 'paused' | 'closed'

export const LISTING_TRANSACTION_TYPES: readonly ListingTransactionType[] = [
  'sale',
  'rent',
  'rent_and_deposit'
]
export const LISTING_STATUSES: readonly ListingStatus[] = ['draft', 'active', 'paused', 'closed']

export type ListingRecord = {
  id: string
  propertyId: string
  transactionType: ListingTransactionType
  status: ListingStatus
  totalPrice: number | null
  deposit: number | null
  monthlyRent: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateListingRecord = {
  id: string
  propertyId: string
  transactionType: ListingTransactionType
  totalPrice: number | null
  deposit: number | null
  monthlyRent: number | null
  createdBy: string
}

export type UpdateListingRecord = {
  transactionType: ListingTransactionType
  status: ListingStatus
  totalPrice: number | null
  deposit: number | null
  monthlyRent: number | null
}

function toListing(row: Record<string, unknown>): ListingRecord {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    transactionType: row.transaction_type as ListingTransactionType,
    status: row.status as ListingStatus,
    totalPrice: row.total_price as number | null,
    deposit: row.deposit as number | null,
    monthlyRent: row.monthly_rent as number | null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

/** crm-architecture-audit-v1.md §C.4 — a Property can have more than one Listing (re-listed for a different transaction type). */
export class ListingRepository {
  constructor(private readonly db: DB) {}

  async create(listing: CreateListingRecord): Promise<ListingRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO listings
        (id, property_id, transaction_type, status, total_price, deposit, monthly_rent,
         created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [
        listing.id,
        listing.propertyId,
        listing.transactionType,
        listing.totalPrice,
        listing.deposit,
        listing.monthlyRent,
        listing.createdBy,
        now,
        now
      ]
    )
    return { ...listing, status: 'draft', createdAt: now, updatedAt: now }
  }

  async getById(id: string): Promise<ListingRecord | null> {
    const result = await this.db.execute('SELECT * FROM listings WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toListing(row) : null
  }

  async getByProperty(propertyId: string): Promise<ListingRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM listings WHERE property_id = ? ORDER BY created_at DESC, rowid DESC',
      [propertyId]
    )
    return result.rows.map(toListing)
  }

  /** Only listings currently marked `active` — what Matching should consider. */
  async getActiveByProperty(propertyId: string): Promise<ListingRecord[]> {
    const result = await this.db.execute(
      "SELECT * FROM listings WHERE property_id = ? AND status = 'active' ORDER BY created_at DESC",
      [propertyId]
    )
    return result.rows.map(toListing)
  }

  async getAllActiveForUser(userId: string): Promise<ListingRecord[]> {
    const result = await this.db.execute(
      `SELECT listings.* FROM listings
       JOIN properties ON properties.id = listings.property_id
       WHERE properties.owner_id = ? AND listings.status = 'active'
       ORDER BY listings.created_at DESC`,
      [userId]
    )
    return result.rows.map(toListing)
  }

  async update(id: string, listing: UpdateListingRecord): Promise<ListingRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE listings
       SET transaction_type = ?, status = ?, total_price = ?, deposit = ?, monthly_rent = ?, updated_at = ?
       WHERE id = ?`,
      [
        listing.transactionType,
        listing.status,
        listing.totalPrice,
        listing.deposit,
        listing.monthlyRent,
        now,
        id
      ]
    )
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Listing ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM listings WHERE id = ?', [id])
  }
}
