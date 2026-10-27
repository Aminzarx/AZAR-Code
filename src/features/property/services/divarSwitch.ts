import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { SyncApiClient } from '@infrastructure/sync/syncApiClient'
import { useAuth } from '@features/auth/AuthProvider'

/**
 * Amin #5795: «ورود آگهی از دیوار» is off until the user turns it on in «تنظیمات ← اتصال‌ها و API‌ها» and agrees to
 * the terms. The server keeps the choice (who, when, the words agreed to) and refuses imports without it; the phone
 * keeps a copy so the paste field and the share target know at once.
 */
export const DIVAR_CONSENT_TEXT =
  'این قابلیت صرفاً برای افزودن آگهی‌های متعلق به خودتان به برنامه ایوان در نظر گرفته شده است. مسئولیت هرگونه استفاده نادرست یا سوءاستفاده از این قابلیت، بر عهده شما خواهد بود.'

const KEY = 'divar_import_on'
const client = new SyncApiClient(AUTH_API_BASE_URL)
let current: boolean | null = null
const listeners = new Set<(on: boolean) => void>()

function publish(on: boolean): void {
  current = on
  listeners.forEach((listener) => listener(on))
}

async function store(): Promise<ApplicationSettingsRepository> {
  return new ApplicationSettingsRepository(await getDatabase())
}

/** The phone's copy (no network): for a share that arrives before any screen asked the server. */
export async function divarImportOn(): Promise<boolean> {
  if (current !== null) return current
  const saved = await (await store()).get(KEY).catch(() => null)
  return saved === '1'
}

export function useDivarImportSwitch(): { on: boolean | null; turn: (on: boolean) => Promise<void> } {
  const { session } = useAuth()
  const [on, setOn] = useState<boolean | null>(current)
  const sessionToken = session?.sessionToken

  useEffect(() => {
    let alive = true
    listeners.add(setOn)
    ;(async () => {
      if (current === null) publish(await divarImportOn())
      if (!sessionToken) return
      const remote = await client.divarConsentStatus(sessionToken)
      if (!alive) return
      publish(remote.on)
      await (await store()).set(KEY, remote.on ? '1' : '0')
    })().catch(() => {
      if (current === null) publish(false)
    })
    return () => {
      alive = false
      listeners.delete(setOn)
    }
  }, [sessionToken])

  const turn = useCallback(
    async (value: boolean) => {
      if (!sessionToken) throw new Error('signed out')
      await client.divarConsent(sessionToken, value)
      publish(value)
      await (await store()).set(KEY, value ? '1' : '0')
    },
    [sessionToken]
  )
  return { on, turn }
}
