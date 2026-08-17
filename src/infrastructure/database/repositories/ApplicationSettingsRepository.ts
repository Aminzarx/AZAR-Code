import type { DB } from '@op-engineering/op-sqlite'

/**
 * Repository-pattern foundation example (Phase 6). Proves the pattern the
 * roadmap requires — the UI never runs SQL directly; every access goes
 * through a typed repository method — using the simplest table in the
 * schema. Deliberately not a business-feature module: this is plain
 * key/value storage access, not reminder-schedule or preference logic.
 * Future repositories (OwnerFileRepository, ApplicantFileRepository, ...)
 * follow this same shape once their owning phase needs them.
 */
export class ApplicationSettingsRepository {
  constructor(private readonly db: DB) {}

  async get(key: string): Promise<string | null> {
    const result = await this.db.execute('SELECT value FROM application_settings WHERE key = ?', [
      key
    ])
    const row = result.rows[0]
    return row ? (row.value as string | null) : null
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO application_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()]
    )
  }

  async delete(key: string): Promise<void> {
    await this.db.execute('DELETE FROM application_settings WHERE key = ?', [key])
  }
}
