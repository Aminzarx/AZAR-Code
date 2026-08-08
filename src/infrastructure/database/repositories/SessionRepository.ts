import type { DB } from '@op-engineering/op-sqlite'

export type SessionRecord = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
}

function toSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    createdAt: row.created_at as string,
    expiresAt: (row.expires_at as string | null) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null
  }
}

export class SessionRepository {
  constructor(private readonly db: DB) {}

  async create(session: {
    id: string
    userId: string
    expiresAt?: string
  }): Promise<SessionRecord> {
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [session.id, session.userId, now, session.expiresAt ?? null]
    )
    return {
      id: session.id,
      userId: session.userId,
      createdAt: now,
      expiresAt: session.expiresAt ?? null,
      revokedAt: null
    }
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const result = await this.db.execute('SELECT * FROM sessions WHERE id = ?', [id])
    const row = result.rows[0]
    return row ? toSession(row) : null
  }

  async revoke(id: string): Promise<void> {
    await this.db.execute('UPDATE sessions SET revoked_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id
    ])
  }
}
