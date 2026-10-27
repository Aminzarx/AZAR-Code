import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'
import { isNightOwlHour, localDay, pickNightLine } from '@shared/utils/greeting'

const SHOWN_ON = 'night_line_shown_on'

/**
 * Amin #5749: the first time Home opens between 01:00 and 04:00 on a day, a random night line replaces the
 * greeting for that visit; later visits that night get the usual «شب بخیر».
 */
export function useNightLine(now: () => Date = () => new Date()): string | null {
  const [line, setLine] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const at = now()
    if (!isNightOwlHour(at)) return
    ;(async () => {
      const settings = new ApplicationSettingsRepository(await getDatabase())
      const day = localDay(at)
      if ((await settings.get(SHOWN_ON)) === day) return
      await settings.set(SHOWN_ON, day)
      if (alive) setLine(pickNightLine())
    })().catch(() => undefined)
    return () => {
      alive = false
    }
    // once per visit to Home
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return line
}
