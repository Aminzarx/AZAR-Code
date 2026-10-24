import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '@features/auth/AuthProvider'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { keychainSecureStorage } from '@infrastructure/security/keychainSecureStorage'
import type { SecureStorage } from '@infrastructure/security/secureStorage'
import { licenceIsOpen, readSignedLicence, type SignedLicence } from '@infrastructure/licence/licenceToken'
import { LicenceContext, OPEN_LICENCE, type Licence } from '@shared/licence/LicenceContext'

const STORE_KEY = 'azar.licence'
const SEEN_KEY = 'azar.licence.seen'
const CHECK_EVERY_MS = 30 * 60 * 1000

type Stored = { signed: string; monthlyToman: number | null; trialDays: number | null }

type StatusResponse = {
  licence: { state: string; endsAt: string | null; monthlyToman: number | null; trialDays: number | null }
  signed: string
}

/** Asks the sign-in server for the account's licence; null when offline or the server cannot answer. */
export async function fetchLicence(baseUrl: string, sessionToken: string): Promise<Stored | null> {
  try {
    const response = await fetch(`${baseUrl}/licence/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    })
    if (!response.ok) return null
    const body = (await response.json()) as StatusResponse
    return { signed: body.signed, monthlyToman: body.licence.monthlyToman, trialDays: body.licence.trialDays }
  } catch {
    return null
  }
}

/**
 * Amin #4906: EYVAN is paid. The server's signed licence is kept on the phone (secure storage), so the trial and a
 * paid month keep working offline; online, the server's answer replaces it at start, on return to the app and every
 * 30 minutes. After the end date the app does not lock: `canEdit` turns false and only reading stays open.
 * Before the first answer ever arrives (an update installed offline) nothing is closed.
 */
export function LicenceProvider({
  children,
  storage = keychainSecureStorage,
  baseUrl = AUTH_API_BASE_URL,
  now = Date.now
}: {
  children: React.ReactNode
  storage?: SecureStorage
  baseUrl?: string
  now?: () => number
}): React.JSX.Element {
  const { session } = useAuth()
  const [stored, setStored] = useState<Stored | null>(null)
  const [seenAt, setSeenAt] = useState(0)
  const [tick, setTick] = useState(0)

  const remember = useCallback(
    async (next: Stored) => {
      await storage.set(STORE_KEY, JSON.stringify(next)).catch(() => undefined)
      setStored(next)
    },
    [storage]
  )

  const refresh = useCallback(async () => {
    if (!session) return
    const fresh = await fetchLicence(baseUrl, session.sessionToken)
    const payload = fresh ? readSignedLicence(fresh.signed) : null
    if (fresh && payload && payload.u === session.userId) await remember(fresh)
    // the latest time this phone has seen; a clock turned back does not reopen an ended licence
    const seen = Math.max(now(), Number((await storage.get(SEEN_KEY).catch(() => null)) ?? 0))
    await storage.set(SEEN_KEY, String(seen)).catch(() => undefined)
    setSeenAt(seen)
    setTick((t) => t + 1)
  }, [session, baseUrl, remember, storage, now])

  useEffect(() => {
    if (!session) {
      setStored(null)
      return
    }
    let cancelled = false
    storage
      .get(STORE_KEY)
      .then((raw) => {
        if (!cancelled && raw) setStored(JSON.parse(raw) as Stored)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) refresh().catch(() => undefined)
      })
    const timer = setInterval(() => refresh().catch(() => undefined), CHECK_EVERY_MS)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => undefined)
    })
    return () => {
      cancelled = true
      clearInterval(timer)
      subscription.remove()
    }
  }, [session, storage, refresh])

  // a trial or a month can end while the app stays open: look again every minute
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const value = useMemo<Licence>(() => {
    const payload: SignedLicence | null = stored ? readSignedLicence(stored.signed) : null
    if (!session || !payload || payload.u !== session.userId) return { ...OPEN_LICENCE, refresh }
    const open = licenceIsOpen(payload, now(), seenAt)
    return {
      canEdit: open,
      state: open ? payload.st : 'expired',
      endsAt: payload.e === null ? null : new Date(payload.e).toISOString(),
      monthlyToman: stored?.monthlyToman ?? null,
      trialDays: stored?.trialDays ?? null,
      refresh
    }
    // `tick` re-reads the clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, session, seenAt, refresh, tick, now])

  return <LicenceContext.Provider value={value}>{children}</LicenceContext.Provider>
}
