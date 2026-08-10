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
  description: string | null
  status: PropertyStatus
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
        (id, owner_id, title, property_type, transaction_type, city, address, price, area, rooms, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
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
         )
         ORDER BY created_at DESC, rowid DESC`,
        [ownerId, pattern, pattern, pattern, pattern]
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
           price = ?, area = ?, rooms = ?, description = ?, status = ?, updated_at = ?
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
