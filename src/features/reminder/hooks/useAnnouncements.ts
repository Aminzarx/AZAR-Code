import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import type { Announcement } from '@infrastructure/sync/syncApiClient'

type UseAnnouncements = {
  announcements: Announcement[]
  /** Amin #6214: how many this account has not seen yet (the home bell's number) */
  unseen: number
  dismiss: (id: string) => void
  /** Amin #6214: these cards are on screen now */
  markSeen: (ids: string[]) => void
  /** Amin #6214: tapped, or its picture/sound/video opened */
  open: (id: string) => void
  reload: () => void
}

/**
 * Amin #5370: KSS announcements on «اعلان‌ها». Offline or signed out there are none (the reminders still show);
 * × hides one at once and tells the server, so it does not come back on this or another phone.
 * Amin #6214: read again whenever the screen is back in view, so the home bell follows what arrived and what was seen.
 */
export function useAnnouncements(): UseAnnouncements {
  const { announcements: api } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // attempt 0 = not in view yet; the first focus (right after mount) reads them
    if (!api || attempt === 0) return undefined
    let cancelled = false
    api
      .list()
      .then((list) => {
        if (!cancelled) setAnnouncements(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  const reload = useCallback(() => setAttempt((current) => current + 1), [])
  useFocusEffect(reload)

  const dismiss = useCallback(
    (id: string) => {
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id))
      api?.dismiss(id).catch(() => undefined)
    },
    [api]
  )
  const markSeen = useCallback(
    (ids: string[]) => {
      if (!api || ids.length === 0) return
      setAnnouncements((current) => current.map((a) => (ids.includes(a.id) ? { ...a, seen: true } : a)))
      api.seen(ids).catch(() => undefined)
    },
    [api]
  )
  const open = useCallback(
    (id: string) => {
      setAnnouncements((current) => current.map((a) => (a.id === id ? { ...a, seen: true } : a)))
      api?.open(id).catch(() => undefined)
    },
    [api]
  )

  const unseen = announcements.filter((announcement) => announcement.seen === false).length
  return { announcements, unseen, dismiss, markSeen, open, reload }
}
