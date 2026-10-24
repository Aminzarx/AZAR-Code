import { NativeModules, Platform } from 'react-native'

/** Amin #5055: «روشن» / «تیره» / «هماهنگ با گوشی» (the default) */
export type AppearanceMode = 'light' | 'dark' | 'system'

type AzarAppearanceNative = { mode?: string; setMode: (mode: AppearanceMode) => void }

const native = (Platform.OS === 'android' ? NativeModules.AzarAppearance : undefined) as AzarAppearanceNative | undefined

/** The choice saved on the phone (read by the native side before the first frame, so there is no flash). */
export function savedAppearanceMode(): AppearanceMode {
  const mode = native?.mode
  return mode === 'light' || mode === 'dark' ? mode : 'system'
}

export function saveAppearanceMode(mode: AppearanceMode): void {
  native?.setMode(mode)
}
