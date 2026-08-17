import { useEffect, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'

const DISPLAY_NAME_KEY = 'display_name'

type DisplayNameState = {
  displayName: string | null
  isLoading: boolean
  setDisplayName: (name: string) => Promise<void>
}

/**
 * The app has no user-name field anywhere (User records only ever needed
 * phone_number + referral_code — see UserRepository) — this is a purely
 * local display preference, so it lives in the generic
 * application_settings key/value table rather than a new users.name
 * column. Read by both SettingsScreen (to edit it) and DashboardScreen
 * (for the greeting + avatar initials).
 */
export function useDisplayName(): DisplayNameState {
  const [displayName, setDisplayNameState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getDatabase()
      .then((db) => new ApplicationSettingsRepository(db).get(DISPLAY_NAME_KEY))
      .then((value) => {
        if (!cancelled) {
          setDisplayNameState(value)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function setDisplayName(name: string): Promise<void> {
    const trimmed = name.trim()
    const db = await getDatabase()
    await new ApplicationSettingsRepository(db).set(DISPLAY_NAME_KEY, trimmed)
    setDisplayNameState(trimmed)
  }

  return { displayName, isLoading, setDisplayName }
}
