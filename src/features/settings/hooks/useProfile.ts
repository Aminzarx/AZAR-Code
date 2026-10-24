import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import RNFS from 'react-native-fs'
import { getDatabase } from '@infrastructure/database/connection'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { useAuth } from '@features/auth/AuthProvider'
import { measureStorageUsage, type StorageUsage } from '../services/storageTokens'

export const PROFILE_KEYS = {
  name: 'display_name',
  agency: 'agency_name',
  photo: 'profile_photo'
} as const

export type Profile = {
  displayName: string | null
  agencyName: string | null
  /** absolute path of the WebP photo in the app's files */
  photoPath: string | null
  phoneNumber: string | null
}

const EMPTY: Profile = { displayName: null, agencyName: null, photoPath: null, phoneNumber: null }

/**
 * v1.5.0 (Amin #4632): the «من» page and the profile page read the same
 * profile — name, agency, photo (this phone's own settings) and the number
 * (the account's). Reloaded every time the screen comes into view, so a
 * change made on the profile page shows at once when the user returns.
 */
export function useProfile(options: { withStorage?: boolean } = {}): {
  profile: Profile
  storage: StorageUsage | null
  reload: () => Promise<void>
} {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile>(EMPTY)
  const [storage, setStorage] = useState<StorageUsage | null>(null)
  const withStorage = options.withStorage === true

  const reload = useCallback(async () => {
    const db = await getDatabase()
    const settings = new ApplicationSettingsRepository(db)
    const [displayName, agencyName, photoPath, user] = await Promise.all([
      settings.get(PROFILE_KEYS.name),
      settings.get(PROFILE_KEYS.agency),
      settings.get(PROFILE_KEYS.photo),
      session ? new UserRepository(db).findById(session.userId) : Promise.resolve(null)
    ])
    setProfile({
      displayName: displayName || null,
      agencyName: agencyName || null,
      photoPath: photoPath || null,
      phoneNumber: user?.phoneNumber ?? null
    })
    if (withStorage) {
      const photoBytes = photoPath ? await RNFS.stat(photoPath).then((s) => Number(s.size)).catch(() => 0) : 0
      setStorage(await measureStorageUsage(db, photoBytes))
    }
  }, [session, withStorage])

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => undefined)
    }, [reload])
  )

  return { profile, storage, reload }
}

/** Saves the profile fields; an empty value clears it. */
export async function saveProfile(values: { displayName: string; agencyName: string; photoPath: string | null }): Promise<void> {
  const settings = new ApplicationSettingsRepository(await getDatabase())
  const put = (key: string, value: string | null) =>
    value && value.trim() ? settings.set(key, value.trim()) : settings.delete(key)
  await put(PROFILE_KEYS.name, values.displayName)
  await put(PROFILE_KEYS.agency, values.agencyName)
  await put(PROFILE_KEYS.photo, values.photoPath)
}
