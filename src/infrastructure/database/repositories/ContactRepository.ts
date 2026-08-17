import type { DB } from '@op-engineering/op-sqlite'

export type ContactRole =
  'owner' | 'buyer' | 'tenant' | 'seller' | 'landlord' | 'agent' | 'collaborator' | 'referrer'

export const CONTACT_ROLES: readonly ContactRole[] = [
  'owner',
  'buyer',
  'tenant',
  'seller',
  'landlord',
  'agent',
  'collaborator',
  'referrer'
]

export type ContactRecord = {
  id: string
  userId: string
  fullName: string
  phoneNumber: string
  email: string | null
  notes: string | null
  isArchived: boolean
  roles: ContactRole[]
  createdAt: string
  updatedAt: string
}

export type CreateContactRecord = {
  id: string
  userId: string
  fullName: string
  phoneNumber: string
  email: string | null
  notes: string | null
  roles: ContactRole[]
}

export type UpdateContactRecord = {
  fullName: string
  phoneNumber: string
  email: string | null
  notes: string | null
  roles: ContactRole[]
}

function toContact(row: Record<string, unknown>, roles: ContactRole[]): ContactRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fullName: row.full_name as string,
    phoneNumber: row.phone_number as string,
    email: row.email as string | null,
    notes: row.notes as string | null,
    isArchived: Boolean(row.is_archived),
    roles,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

/**
 * `crm-architecture-audit-v1.md` §C.2 — one Contact can hold several
 * roles at once (e.g. Owner + Seller), so roles live in a separate
 * `contact_roles` table rather than a single column; this repository
 * always returns/accepts the full role set together with the contact
 * row rather than exposing role management as a separate API, since no
 * caller needs partial role updates yet (§ Rule 8 — don't build for a
 * use case nothing asks for).
 */
export class ContactRepository {
  constructor(private readonly db: DB) {}

  private async getRoles(contactId: string): Promise<ContactRole[]> {
    const result = await this.db.execute(
      'SELECT role FROM contact_roles WHERE contact_id = ? ORDER BY role',
      [contactId]
    )
    return result.rows.map((row) => row.role as ContactRole)
  }

  private async setRoles(contactId: string, roles: ContactRole[]): Promise<void> {
    await this.db.execute('DELETE FROM contact_roles WHERE contact_id = ?', [contactId])
    const now = new Date().toISOString()
    for (const role of roles) {
      await this.db.execute(
        `INSERT INTO contact_roles (id, contact_id, role, created_at) VALUES (?, ?, ?, ?)`,
        [`${contactId}-role-${role}`, contactId, role, now]
      )
    }
  }

  async create(contact: CreateContactRecord): Promise<ContactRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO contacts
        (id, user_id, full_name, phone_number, email, notes, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        contact.id,
        contact.userId,
        contact.fullName,
        contact.phoneNumber,
        contact.email,
        contact.notes,
        now,
        now
      ]
    )
    await this.setRoles(contact.id, contact.roles)
    return {
      ...contact,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }
  }

  async getById(id: string): Promise<ContactRecord | null> {
    const result = await this.db.execute('SELECT * FROM contacts WHERE id = ?', [id])
    const row = result.rows[0]
    if (!row) {
      return null
    }
    return toContact(row, await this.getRoles(id))
  }

  async getAll(userId: string): Promise<ContactRecord[]> {
    const result = await this.db.execute(
      'SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC, rowid DESC',
      [userId]
    )
    return Promise.all(
      result.rows.map(async (row) => toContact(row, await this.getRoles(row.id as string)))
    )
  }

  /** Matches against full name and phone number (simple substring); optionally narrowed to one role. */
  async search(userId: string, query: string, role?: ContactRole): Promise<ContactRecord[]> {
    const pattern = `%${query.trim()}%`
    const roleJoin = role
      ? 'JOIN contact_roles cr ON cr.contact_id = contacts.id AND cr.role = ?'
      : ''
    const params = role ? [role, userId, pattern, pattern] : [userId, pattern, pattern]
    const result = await this.db.execute(
      `SELECT contacts.* FROM contacts ${roleJoin}
       WHERE contacts.user_id = ? AND (full_name LIKE ? OR phone_number LIKE ?)
       ORDER BY contacts.created_at DESC, contacts.rowid DESC`,
      params
    )
    return Promise.all(
      result.rows.map(async (row) => toContact(row, await this.getRoles(row.id as string)))
    )
  }

  /** For duplicate detection (§20) — exact phone match within the same user's contacts. */
  async findByPhoneNumber(userId: string, phoneNumber: string): Promise<ContactRecord | null> {
    const result = await this.db.execute(
      'SELECT * FROM contacts WHERE user_id = ? AND phone_number = ? LIMIT 1',
      [userId, phoneNumber]
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }
    return toContact(row, await this.getRoles(row.id as string))
  }

  async update(id: string, contact: UpdateContactRecord): Promise<ContactRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `UPDATE contacts
       SET full_name = ?, phone_number = ?, email = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [contact.fullName, contact.phoneNumber, contact.email, contact.notes, now, id]
    )
    await this.setRoles(id, contact.roles)
    const updated = await this.getById(id)
    if (!updated) {
      throw new Error(`Contact ${id} not found after update`)
    }
    return updated
  }

  /** Soft delete (BR-007) — contacts are never physically removed. */
  async archive(id: string): Promise<void> {
    await this.db.execute('UPDATE contacts SET is_archived = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id
    ])
  }
}
