import type { DB } from '@op-engineering/op-sqlite'
import { toPersianDigits } from '../../../shared/utils/persianText'

/**
 * #5716 full check: a file or an applicant that a deal points at cannot be deleted (the database keeps the link;
 * contracts and reminders are handled on delete, Amin #5864). Asked before deleting, so the user is told what is linked instead of a silent failure.
 */
export class LinkedRecordsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkedRecordsError'
  }
}

// Amin #5864: contracts stay (they keep the names) and reminders go with the file; deals still hold it
const TABLES: ReadonlyArray<[table: string, noun: string]> = [['deals', 'معامله']]

/** «۲ قرارداد و ۱ یادآوری»; null when nothing points at it. */
export async function linkedTo(
  db: DB,
  column: 'property_id' | 'applicant_id',
  id: string
): Promise<string | null> {
  const parts: string[] = []
  for (const [table, noun] of TABLES) {
    const result = await db.execute(`SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`, [
      id
    ])
    const count = Number(result.rows[0]?.count ?? 0)
    if (count > 0) parts.push(`${toPersianDigits(String(count))} ${noun}`)
  }
  if (parts.length === 0) return null
  return parts.length === 1
    ? parts[0]!
    : `${parts.slice(0, -1).join('، ')} و ${parts[parts.length - 1]}`
}

/** The whole sentence shown instead of deleting. */
export function linkedMessage(what: 'این فایل' | 'این متقاضی', links: string): string {
  return `${what} به ${links} وصل است؛ برای حذف، اول آن‌ها را حذف کنید.`
}
