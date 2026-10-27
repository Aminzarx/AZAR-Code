import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@features/auth/AuthProvider'
import type { Announcement } from '@infrastructure/sync/syncApiClient'

/**
 * Amin #5370: KSS announcements on «اعلان‌ها». Offline or signed out there are none (the reminders still show);
 * × hides one at once and tells the server, so it does not come back on this or another phone.
 */
export function useAnnouncements(): { announcements: Announcement[]; dismiss: (id: string) => void; reload: () => void } {
  const { announcements: api } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!api) return undefined
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

  const dismiss = useCallback(
    (id: string) => {
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id))
      api?.dismiss(id).catch(() => undefined)
    },
    [api]
  )
  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  return { announcements, dismiss, reload }
}
