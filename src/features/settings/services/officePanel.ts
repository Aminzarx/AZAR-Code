import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { OfficeRefusedError, SyncApiClient, type OfficeStatus } from '@infrastructure/sync/syncApiClient'

/**
 * Amin #5970: the office panel is granted, not open. The user asks from «تنظیمات ← اتصال‌ها و API‌ها ← پنل دفتر املاک»
 * and sales management approves; from then on the app shows one full screen pointing to the panel (kssx.ir/app)
 * instead of working. The phone's files stay exactly as they are — turning the panel off gives the app back.
 * The phone keeps the last answer, so the screen also shows offline.
 */
export const OFFICE_PANEL_URL = 'https://kssx.ir/app'
/** Amin #5970, word for word */
export const OFFICE_REQUEST_CONFIRM_TEXT =
  'شما در حال ارسال درخواست تخصیص پرتال دفاتر املاک هستید، با فعال شدن این پرتال، اپلیکیشن غیر فعال و پرتال برای شما فعال میشود'

const KEY = 'office_portal_on'
export const officeClient = new SyncApiClient(AUTH_API_BASE_URL)

let current: boolean | null = null
const listeners = new Set<(on: boolean) => void>()

async function store(): Promise<ApplicationSettingsRepository> {
  return new ApplicationSettingsRepository(await getDatabase())
}

/** Every screen that knows the latest answer passes it here (the request page, the gate) */
export function notePortal(on: boolean): void {
  if (current === on) return
  current = on
  listeners.forEach((listener) => listener(on))
  store()
    .then((s) => s.set(KEY, on ? '1' : '0'))
    .catch(() => undefined)
}

/**
 * The gate: the kept answer at once, then the server's (at start and each time the app comes back to the front).
 * null until the kept answer is read.
 */
export function useOfficePortal(sessionToken: string | undefined): boolean | null {
  const [on, setOn] = useState<boolean | null>(current)
  const check = useCallback(async () => {
    if (!sessionToken) return
    const status = await officeClient.officeStatus(sessionToken)
    notePortal(status.portal)
  }, [sessionToken])

  useEffect(() => {
    listeners.add(setOn)
    ;(async () => {
      if (current === null) {
        const saved = await (await store()).get(KEY).catch(() => null)
        if (current === null) {
          current = saved === '1'
          setOn(current)
        }
      }
    })().catch(() => setOn(false))
    return () => {
      listeners.delete(setOn)
    }
  }, [])

  useEffect(() => {
    check().catch(() => undefined) // offline: the kept answer stands
    const change = AppState.addEventListener('change', (state) => {
      if (state === 'active') check().catch(() => undefined)
    })
    return () => change.remove()
  }, [check])
  return sessionToken ? on : false
}

/** the status page's answer, with the gate kept in step */
export async function loadOfficeStatus(sessionToken: string): Promise<OfficeStatus> {
  const status = await officeClient.officeStatus(sessionToken)
  notePortal(status.portal)
  return status
}

/** «eyvan://office-link?c=12345678», a pasted link or a typed code (Persian digits too) → the 8 digits, or null */
export function linkCodeOf(raw: string): string | null {
  const latin = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const fromLink = latin.match(/[?&]c=(\d{8})\b/)
  if (fromLink) return fromLink[1]
  const digits = latin.replace(/[\s-]/g, '')
  return /^\d{8}$/.test(digits) ? digits : null
}

/** The server's own Persian sentence when it refused; otherwise the network line */
export function officeErrorText(error: unknown): string {
  if (error instanceof OfficeRefusedError && error.message) return error.message
  return 'انجام نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.'
}
