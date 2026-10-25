import { NativeModules, Platform } from 'react-native'

type AzarScreenNative = { setScreenshotsAllowed: (allowed: boolean) => void }

const native: AzarScreenNative | undefined =
  Platform.OS === 'android' ? (NativeModules.AzarScreen as AzarScreenNative | undefined) : undefined

/** Amin #5162: screenshots only in the Settings section; everywhere else the window stays secure (FLAG_SECURE) */
export function setScreenshotsAllowed(allowed: boolean): void {
  native?.setScreenshotsAllowed(allowed)
}
