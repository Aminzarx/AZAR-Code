import type { DB } from '@op-engineering/op-sqlite'
import { PhotoRepository } from './PhotoRepository'
import { ContactRepository } from './ContactRepository'

export type PropertyStatus = 'active' | 'archived'

/** Amin #5066: the file's owner — a contact (role «مالک») linked through properties.owner_contact_id. */
export type PropertyOwner = {
  contactId: string
  fullName: string
  /** canonical +98… */
  phoneNumber: string
  notes: string | null
}

/** What the form gives for the owner; `newId` is used only when no contact with that phone exists yet. */
export type PropertyOwnerWrite = {
  newId: string
  fullName: string
  phoneNumber: string
  notes: string | null
}

/** The properties row plus its owner contact's fields (aliased so they never clash with the property's own). */
const SELECT_WITH_OWNER = `SELECT p.*, c.full_name AS owner_full_name, c.phone_number AS owner_phone_number,
    c.notes AS owner_notes
  FROM properties p LEFT JOIN contacts c ON c.id = p.owner_contact_id`

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
  /** Amin #5066; null = no owner given (absent on records built outside the repository) */
  owner?: PropertyOwner | null
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
  owner?: PropertyOwnerWrite | null
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
  /** undefined = leave the owner as it is; null = unlink it (the contact itself stays) */
  owner?: PropertyOwnerWrite | null
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
    owner:
      row.owner_contact_id && typeof row.owner_full_name === 'string'
        ? {
            contactId: row.owner_contact_id as string,
            fullName: row.owner_full_name,
            phoneNumber: row.owner_phone_number as string,
            notes: (row.owner_notes as string | null) ?? null
          }
        : null,
    status: row.status as PropertyStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class PropertyRepository {
  constructor(private readonly db: DB) {}

  /**
   * Amin #5066: the owner is kept as a contact with the «مالک» role. The file's current owner contact is updated when
   * the phone stays the same; otherwise an existing contact with that phone is reused (no duplicate person), or a new
   * one is made. Returns the contact id to link.
   */
  private async saveOwner(
    userId: string,
    owner: PropertyOwnerWrite,
    currentContactId: string | null
  ): Promise<string> {
    const contacts = new ContactRepository(this.db)
    const current = currentContactId ? await contacts.getById(currentContactId) : null
    const existing =
      current && current.phoneNumber === owner.phoneNumber
        ? current
        : await contacts.findByPhoneNumber(userId, owner.phoneNumber)
    if (!existing) {
      await contacts.create({
        id: owner.newId,
        userId,
        fullName: owner.fullName,
        phoneNumber: owner.phoneNumber,
        email: null,
        notes: owner.notes,
        roles: ['owner']
      })
      return owner.newId
    }
    await contacts.update(existing.id, {
      fullName: owner.fullName,
      phoneNumber: owner.phoneNumber,
      email: existing.email,
      // the file's own owner keeps what the form shows; a contact found by phone keeps its notes unless new ones are typed
      notes: existing.id === current?.id ? owner.notes : (owner.notes ?? existing.notes),
      roles: existing.roles.includes('owner') ? existing.roles : [...existing.roles, 'owner']
    })
    return existing.id
  }

  async create(property: CreatePropertyRecord): Promise<PropertyRecord> {
    const now = new Date().toISOString()
    const ownerContactId = property.owner
      ? await this.saveOwner(property.ownerId, property.owner, null)
      : null
    await this.db.execute(
      `INSERT INTO properties
        (id, owner_id, title, property_type, transaction_type, city, address, price, area, rooms,
         deposit_amount, rent_amount, is_convertible, barter_items, barter_other_description,
         description, owner_contact_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
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
        ownerContactId,
        now,
        now
      ]
    )
    const { owner, ...rest } = property
    return {
      ...rest,
      owner:
        owner && ownerContactId
          ? {
              contactId: ownerContactId,
              fullName: owner.fullName,
              phoneNumber: owner.phoneNumber,
              notes: owner.notes
            }
          : null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  }

  async findById(id: string): Promise<PropertyRecord | null> {
    const result = await this.db.execute(`${SELECT_WITH_OWNER} WHERE p.id = ?`, [id])
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
        `${SELECT_WITH_OWNER}
         WHERE p.owner_id = ? AND (
           p.title LIKE ? OR p.city LIKE ? OR p.address LIKE ? OR CAST(p.price AS TEXT) LIKE ?
           OR p.barter_items LIKE ? OR p.barter_other_description LIKE ?
           OR c.full_name LIKE ?
         )
         ORDER BY p.created_at DESC, p.rowid DESC`,
        [ownerId, pattern, pattern, pattern, pattern, pattern, pattern, pattern]
      )
      return result.rows.map(toProperty)
    }

    const result = await this.db.execute(
      `${SELECT_WITH_OWNER} WHERE p.owner_id = ? ORDER BY p.created_at DESC, p.rowid DESC`,
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
    if (property.owner !== undefined) {
      const row = (
        await this.db.execute('SELECT owner_id, owner_contact_id FROM properties WHERE id = ?', [id])
      ).rows[0]
      if (row) {
        const contactId = property.owner
          ? await this.saveOwner(
              row.owner_id as string,
              property.owner,
              (row.owner_contact_id as string | null) ?? null
            )
          : null
        await this.db.execute('UPDATE properties SET owner_contact_id = ? WHERE id = ?', [
          contactId,
          id
        ])
      }
    }
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
    // Amin #5062: its photos go with it (their server copies are deleted on the next push, giving the tokens back)
    await new PhotoRepository(this.db, () => '').deleteFor('property', id)
    await this.db.execute('DELETE FROM properties WHERE id = ?', [id])
  }
}
