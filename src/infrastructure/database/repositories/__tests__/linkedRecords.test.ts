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

describe('linkedRecords (#5716, Amin #5864)', () => {
  it('only deals hold a file back; the sentence names them in Persian', async () => {
    const links = await linkedTo(
      fakeDb({ deals: 2, contracts: 1, reminders: 3 }),
      'property_id',
      'p1'
    )
    expect(links).toBe('۲ معامله')
    expect(linkedMessage('این فایل', links!)).toBe(
      'این فایل به ۲ معامله وصل است؛ برای حذف، اول آن‌ها را حذف کنید.'
    )
  })

  it('contracts and reminders alone do not block (they are handled on delete)', async () => {
    expect(await linkedTo(fakeDb({ contracts: 1, reminders: 3 }), 'applicant_id', 'a1')).toBeNull()
  })
})
