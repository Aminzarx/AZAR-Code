import type { DB } from '@op-engineering/op-sqlite'

/**
 * Storage tokens (Amin #4164, decided 2026-10-22): each account has 50 MB of
 * storage, shown as tokens: 1 KB = 0.127 token, 1 MB = 1000 KB, so the whole
 * allowance is 6,350 tokens. A file uses the tokens of the data and pictures it
 * holds; deleting it gives them back.
 */
export const TOKENS_PER_KB = 0.127
export const STORAGE_TOKEN_ALLOWANCE = 6350

/** Tables holding what the user entered (computed tables like matches and logs are not counted). */
export const USER_DATA_TABLES = [
  'owner_files',
  'owner_file_amenities',
  'properties',
  'listings',
  'applicant_files',
  'applicants',
  'requirement_criteria',
  'contacts',
  'deals',
  'deal_stage_history',
  'contracts',
  'reminders',
  'reminder_schedules',
  'notes',
  'activities'
] as const

export function bytesToTokens(bytes: number): number {
  return (bytes / 1000) * TOKENS_PER_KB
}

/** UTF-8 byte length (Persian letters take 2 bytes). */
export function utf8Length(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

export type StorageUsage = {
  bytes: number
  tokens: number
  allowance: number
  /** 0…1 */
  share: number
}

/**
 * Amin #5062: a photo costs its WebP size (as on the server, where its bytes are a blob) plus its small row — not
 * the longer base64 text it is carried in while waiting to be sent.
 */
export async function photoBytes(db: DB): Promise<number> {
  try {
    const result = await db.execute('SELECT * FROM photos')
    let bytes = 0
    for (const row of result.rows ?? []) {
      bytes += Number(row.bytes ?? 0) + utf8Length(JSON.stringify({ ...row, data: null }))
    }
    return bytes
  } catch {
    return 0
  }
}

/** Sums the stored size of the user's own data plus any extra files (the profile photo). */
export async function measureStorageUsage(db: DB, extraBytes = 0): Promise<StorageUsage> {
  let bytes = extraBytes
  for (const table of USER_DATA_TABLES) {
    try {
      const result = await db.execute(`SELECT * FROM ${table}`)
      for (const row of result.rows ?? []) {
        bytes += utf8Length(JSON.stringify(row))
      }
    } catch {
      // a table an older database does not have yet holds nothing
    }
  }
  bytes += await photoBytes(db)
  const tokens = bytesToTokens(bytes)
  return {
    bytes,
    tokens,
    allowance: STORAGE_TOKEN_ALLOWANCE,
    share: Math.min(1, tokens / STORAGE_TOKEN_ALLOWANCE)
  }
}

/** «۱۲٫۴» style: one decimal, at least 0.1 when anything is stored. */
export function roundTokens(tokens: number): number {
  if (tokens <= 0) return 0
  return Math.max(0.1, Math.round(tokens * 10) / 10)
}
