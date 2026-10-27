import type { DB } from '@op-engineering/op-sqlite'

/**
 * The size of what the user keeps on the phone (Amin #4164). Tokens are not worked out here: the rate per KB is set
 * in kss-pricing and only the server turns bytes into tokens (Amin #5446, #4302: no hard-coded price in the app).
 */

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
  return { bytes }
}
