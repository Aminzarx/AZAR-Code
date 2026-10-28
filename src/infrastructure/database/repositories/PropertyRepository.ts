import type { DB } from '@op-engineering/op-sqlite'
import { LinkedRecordsError, linkedMessage, linkedTo } from './linkedRecords'
import { PhotoRepository } from './PhotoRepository'
import { ContactRepository } from './ContactRepository'
import { likeAllTerms } from '../../../shared/utils/persianText'

// Amin #5368: a file is found by its deal type, kind, price (any of the three amounts), city, address, description,
// barter items and owner's name
const PROPERTY_SEARCH_COLUMNS = [
  'p.title',
  'p.city',
  'p.region',
  'p.address',
  'p.description',
  'p.transaction_type',
  'p.property_type',
  'CAST(p.price AS TEXT)',
  'CAST(p.deposit_amount AS TEXT)',
  'CAST(p.rent_amount AS TEXT)',
  'p.barter_items',
  'p.barter_other_description',
  'c.full_name'
] as const

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
    c.notes AS owner_notes,
    (EXISTS (SELECT 1 FROM contracts k WHERE k.property_id = p.id AND k.status IN ('active', 'completed'))
      OR EXISTS (SELECT 1 FROM deals d WHERE d.property_id = p.id AND d.current_stage IN ('contract', 'won')))
      AS is_closed
  FROM properties p LEFT JOIN contacts c ON c.id = p.owner_contact_id`

export type PropertyRecord = {
  id: string
  ownerId: string
  title: string
  propertyType: string | null
  transactionType: string | null
  city: string
  address: string
  /** Amin #5416: the district, beside the city */
  region?: string | null
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
  /**
   * Amin #5241: the file has an active/completed contract or a deal at «قرارداد»/«موفق», so it is off the market and
   * never offered in matching. Read-only, worked out on every read.
   */
  closed?: boolean
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
  /** Amin #5416: the district, beside the city */
  region?: string | null
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
  /** Amin #5416: the district, beside the city */
  region?: string | null
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

export function parseBarterItems(raw: unknown): string[] {
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
    region: (row.region as string | null) ?? null,
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
    closed: Boolean(row.is_closed),
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
        (id, owner_id, title, property_type, transaction_type, city, region, address, price, area, rooms,
         deposit_amount, rent_amount, is_convertible, barter_items, barter_other_description,
         description, owner_contact_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        property.id,
        property.ownerId,
        property.title,
        property.propertyType,
        property.transactionType,
        property.city,
        property.region || null,
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
   * design-system.md §7.2.2 — every word of `search` must match one of PROPERTY_SEARCH_COLUMNS (substring; amounts
   * are cast to text, so "500" also finds a price that holds it).
   */
  async findAllByOwner(ownerId: string, search?: string): Promise<PropertyRecord[]> {
    // Amin #5557: «۳ خوابه» / «۱۰۰ متری» search the rooms and the area themselves
    const match = likeAllTerms(PROPERTY_SEARCH_COLUMNS, search ?? '', {
      rooms: 'p.rooms',
      area: 'p.area'
    })
    if (match.sql) {
      const result = await this.db.execute(
        `${SELECT_WITH_OWNER}
         WHERE p.owner_id = ? AND ${match.sql}
         ORDER BY p.created_at DESC, p.rowid DESC`,
        [ownerId, ...match.params]
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
        await this.db.execute('SELECT owner_id, owner_contact_id FROM properties WHERE id = ?', [
          id
        ])
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
       SET title = ?, property_type = ?, transaction_type = ?, city = ?, region = ?, address = ?,
           price = ?, area = ?, rooms = ?, deposit_amount = ?, rent_amount = ?, is_convertible = ?,
           barter_items = ?, barter_other_description = ?,
           description = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        property.title,
        property.propertyType,
        property.transactionType,
        property.city,
        property.region || null,
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

  /** #5716: what keeps it from being deleted (a contract, a deal, a reminder), as a sentence; null when nothing */
  async deletionBlocker(id: string): Promise<string | null> {
    const links = await linkedTo(this.db, 'property_id', id)
    return links ? linkedMessage('این فایل', links) : null
  }

  async delete(id: string): Promise<void> {
    const blocker = await this.deletionBlocker(id)
    if (blocker) throw new LinkedRecordsError(blocker)
    // Amin #5864: its reminders go with it; its contracts stay and keep its name
    const title = await this.db.execute('SELECT title FROM properties WHERE id = ?', [id])
    await this.db.execute(
      'UPDATE contracts SET property_label = COALESCE(property_label, ?) WHERE property_id = ?',
      [(title.rows[0]?.title as string | undefined) ?? null, id] as never[]
    )
    await this.db.execute('DELETE FROM reminders WHERE property_id = ?', [id])
    await this.db.execute('DELETE FROM listings WHERE property_id = ?', [id])
    // Amin #5062: its photos go with it (their server copies are deleted on the next push, giving the tokens back)
    await new PhotoRepository(this.db, () => '').deleteFor('property', id)
    await this.db.execute('DELETE FROM properties WHERE id = ?', [id])
  }
}
