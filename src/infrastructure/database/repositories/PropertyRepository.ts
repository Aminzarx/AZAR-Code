import type { DB } from '@op-engineering/op-sqlite'

export type PropertyStatus = 'active' | 'archived'

export type PropertyRecord = {
  id: string
  ownerId: string
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  address: string
  price: number | null
  area: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
  /** Only meaningful when transactionType is تهاتر — the selected barter categories (طلا/خودرو/زمین/ملک/سایر). */
  barterItems: string[]
  /** Only meaningful when barterItems includes "سایر" — free-text description of that custom item. */
  barterOtherDescription: string | null
  description: string | null
  status: PropertyStatus
  createdAt: string
  updatedAt: string
}

export type CreatePropertyRecord = {
  id: string
  ownerId: string
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  address: string
  price: number | null
  area: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
  barterItems: string[]
  barterOtherDescription: string | null
  description: string | null
}

export type UpdatePropertyRecord = {
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  address: string
  price: number | null
  area: number | null
  rooms: number | null
  depositAmount: number | null
  rentAmount: number | null
  isConvertible: boolean
  barterItems: string[]
  barterOtherDescription: string | null
  description: string | null
  status: PropertyStatus
}

function parseBarterItems(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length === 0) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function toProperty(row: Record<string, unknown>): PropertyRecord {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    title: row.title as string,
    propertyType: row.property_type as string | null,
    transactionType: row.transaction_type as string | null,
    city: row.city as string,
    address: row.address as string,
    price: row.price as number | null,
    area: row.area as number | null,
    rooms: row.rooms as number | null,
    depositAmount: row.deposit_amount as number | null,
    rentAmount: row.rent_amount as number | null,
    isConvertible: Boolean(row.is_convertible),
    barterItems: parseBarterItems(row.barter_items),
    barterOtherDescription: row.barter_other_description as string | null,
    description: row.description as string | null,
    status: row.status as PropertyStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class PropertyRepository {
  constructor(private readonly db: DB) {}

  async create(property: CreatePropertyRecord): Promise<PropertyRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO properties
        (id, owner_id, title, property_type, transaction_type, city, address, price, area, rooms,
         deposit_amount, rent_amount, is_convertible, barter_items, barter_other_description,
         description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        property.id,
        property.ownerId,
        property.title,
        property.propertyType,
        property.transactionType,
        property.city,
        property.address,
        property.price,
        property.area,
        property.rooms,
        property.depositAmount,
        property.rentAmount,
        property.isConvertible ? 1 : 0,
        property.barterItems.length > 0 ? JSON.stringify(property.barterItems) : null,
        property.barterOtherDescription,
        property.description,
        now,
        now
      ]
    )
    return {
      ...property,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  }

  async findById(id: string): Promise<PropertyRecord | null> {
    const result = await this.db.execute('SELECT * FROM properties WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toProperty(row) : null
  }

  /**
   * design-system.md §7.2.2 — `search` matches against title, city,
   * address, and price (simple substring, case-insensitive via SQLite's
   * default LIKE collation; price is cast to text since it's stored as
   * a plain-digit number, so a search like "500" also finds it inside a
   * price value).
   */
  async findAllByOwner(ownerId: string, search?: string): Promise<PropertyRecord[]> {
    if (search && search.trim().length > 0) {
      const pattern = `%${search.trim()}%`
      const result = await this.db.execute(
        `SELECT * FROM properties
         WHERE owner_id = ? AND (
           title LIKE ? OR city LIKE ? OR address LIKE ? OR CAST(price AS TEXT) LIKE ?
           OR barter_items LIKE ? OR barter_other_description LIKE ?
         )
         ORDER BY created_at DESC, rowid DESC`,
        [ownerId, pattern, pattern, pattern, pattern, pattern, pattern]
      )
      return result.rows.map(toProperty)
    }

    const result = await this.db.execute(
      'SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC',
      [ownerId]
    )
    return result.rows.map(toProperty)
  }

  async countByOwner(ownerId: string): Promise<number> {
    const result = await this.db.execute(
      'SELECT COUNT(*) as count FROM properties WHERE owner_id = ?',
      [ownerId]
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async update(id: string, property: UpdatePropertyRecord): Promise<PropertyRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE properties
       SET title = ?, property_type = ?, transaction_type = ?, city = ?, address = ?,
           price = ?, area = ?, rooms = ?, deposit_amount = ?, rent_amount = ?, is_convertible = ?,
           barter_items = ?, barter_other_description = ?,
           description = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        property.title,
        property.propertyType,
        property.transactionType,
        property.city,
        property.address,
        property.price,
        property.area,
        property.rooms,
        property.depositAmount,
        property.rentAmount,
        property.isConvertible ? 1 : 0,
        property.barterItems.length > 0 ? JSON.stringify(property.barterItems) : null,
        property.barterOtherDescription,
        property.description,
        property.status,
        now,
        id
      ]
    )
    const updated = await this.findById(id)
    if (!updated) {
      throw new Error(`Property ${id} not found after update`)
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM properties WHERE id = ?', [id])
  }
}
