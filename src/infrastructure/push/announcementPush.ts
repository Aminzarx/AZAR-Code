import { NativeModules, PermissionsAndroid, Platform } from 'react-native'

/**
 * Amin #6214: announcements marked «روی گوشی هم» reach the phone's notification shade through Android's own background
 * check (AzarAnnouncementWorker, about every 15 minutes; no outside push service). Elsewhere (web, tests) all of this
 * does nothing, and the in-app bell still counts them.
 */
type AzarPushNative = {
  seenUpTo: (createdAt: string) => void
  askedOnce: () => Promise<boolean>
}

const native = Platform.OS === 'android' ? (NativeModules.AzarPush as AzarPushNative | undefined) : undefined

/** the app has shown announcements up to this time; the background check only announces newer ones */
export function announcementsSeenUpTo(createdAt: string | undefined): void {
  if (createdAt) native?.seenUpTo(createdAt)
}

/**
 * Asked once, the first time «اعلان‌ها» opens (Android 13+ needs it; older versions allow it already).
 * Declining changes nothing in the app: the bell still shows the number.
 */
export async function askNotificationsOnce(): Promise<void> {
  if (!native || Platform.OS !== 'android' || Number(Platform.Version) < 33) return
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    if (await PermissionsAndroid.check(permission)) return
    if (await native.askedOnce()) return
    await PermissionsAndroid.request(permission)
  } catch {
    // no answer is the same as «no»
  }
}
