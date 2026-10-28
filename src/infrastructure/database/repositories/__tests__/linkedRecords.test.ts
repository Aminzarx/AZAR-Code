import type { DB } from '@op-engineering/op-sqlite'
import { linkedMessage, linkedTo } from '../linkedRecords'

function fakeDb(counts: Record<string, number>): DB {
  return {
    execute: async (sql: string) => {
      const table = /FROM (\w+)/.exec(sql)?.[1] ?? ''
      return { rows: [{ count: counts[table] ?? 0 }] }
    }
  } as unknown as DB
}

describe('linkedRecords (#5716)', () => {
  it('names what a file is linked to, in Persian', async () => {
    const links = await linkedTo(fakeDb({ contracts: 2, reminders: 1 }), 'property_id', 'p1')
    expect(links).toBe('۲ قرارداد و ۱ یادآوری')
    expect(linkedMessage('این فایل', links!)).toBe(
      'این فایل به ۲ قرارداد و ۱ یادآوری وصل است؛ برای حذف، اول آن‌ها را حذف کنید.'
    )
  })

  it('lists three with a comma, and is null when nothing links', async () => {
    expect(
      await linkedTo(fakeDb({ contracts: 1, deals: 1, reminders: 3 }), 'applicant_id', 'a1')
    ).toBe('۱ قرارداد، ۱ معامله و ۳ یادآوری')
    expect(await linkedTo(fakeDb({}), 'applicant_id', 'a1')).toBeNull()
  })
})
