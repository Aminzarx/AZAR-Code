import type { DB } from '@op-engineering/op-sqlite'

export type UserRecord = {
  id: string
  phoneNumber: string
  referralCode: string
  createdAt: string
  updatedAt: string
}

function toUser(row: Record<string, unknown>): UserRecord {
  return {
    id: row.id as string,
    phoneNumber: row.phone_number as string,
    referralCode: row.referral_code as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class UserRepository {
  constructor(private readonly db: DB) {}

  async create(user: {
    id: string
    phoneNumber: string
    referralCode: string
  }): Promise<UserRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.phoneNumber, user.referralCode, now, now]
    )
    return { ...user, createdAt: now, updatedAt: now }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserRecord | null> {
    const result = await this.db.execute('SELECT * FROM users WHERE phone_number = ?', [
      phoneNumber
    ])
    const row = result.rows[0]
    return row ? toUser(row) : null
  }

  async findByReferralCode(referralCode: string): Promise<UserRecord | null> {
    const result = await this.db.execute('SELECT * FROM users WHERE referral_code = ?', [
      referralCode
    ])
    const row = result.rows[0]
    return row ? toUser(row) : null
  }

  /** v1.5.0 (Amin #4632): the account moved to a new number on the server. */
  async updatePhoneNumber(id: string, phoneNumber: string): Promise<void> {
    await this.db.execute('UPDATE users SET phone_number = ?, updated_at = ? WHERE id = ?', [
      phoneNumber,
      new Date().toISOString(),
      id
    ])
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.db.execute('SELECT * FROM users WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toUser(row) : null
  }
}
