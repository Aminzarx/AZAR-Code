import { NativeModules, Platform } from 'react-native'
import type { PaletteName } from './palettes'

/** Amin #5055: «روشن» / «تیره» / «هماهنگ با گوشی» (the default) */
export type AppearanceMode = 'light' | 'dark' | 'system'

type AzarAppearanceNative = {
  mode?: string
  palette?: string
  setMode: (mode: AppearanceMode) => void
  setPalette?: (name: string) => void
  setBars?: (colour: string, dark: boolean) => void
}

const native = (Platform.OS === 'android' ? NativeModules.AzarAppearance : undefined) as AzarAppearanceNative | undefined

/** The choice saved on the phone (read by the native side before the first frame, so there is no flash). */
export function savedAppearanceMode(): AppearanceMode {
  const mode = native?.mode
  return mode === 'light' || mode === 'dark' ? mode : 'system'
}

export function saveAppearanceMode(mode: AppearanceMode): void {
  native?.setMode(mode)
}

/** Amin #5308: the theme (navy, blue or charcoal), saved on the phone next to the light/dark choice */
export function savedPaletteName(): PaletteName {
  const name = native?.palette
  return name === 'blue' || name === 'charcoal' ? name : 'navy'
}

export function savePaletteName(name: PaletteName): void {
  native?.setPalette?.(name)
}

/** the status and navigation bars in the page colour of the chosen theme */
export function colourSystemBars(colour: string, dark: boolean): void {
  native?.setBars?.(colour, dark)
}
