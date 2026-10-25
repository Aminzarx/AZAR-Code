import { darkColors, lightColors, type Palette } from './tokens'

/**
 * Amin #5298/#5308: «شخصی‌سازی» themes — the navy of kssx.ir (default), blue, and charcoal. Navy and blue have a
 * light and a dark side (the «حالت نمایش» choice); charcoal is dark only. Same colour roles as tokens.ts.
 */
export type PaletteName = 'navy' | 'blue' | 'charcoal'

export const PALETTE_NAMES: readonly PaletteName[] = ['navy', 'blue', 'charcoal']

export const PALETTE_LABELS: Record<PaletteName, string> = { navy: 'سرمه‌ای', blue: 'آبی', charcoal: 'ذغال‌سنگی' }

const blueLight: Palette = {
  ...lightColors,
  primary: '#2F6BD6',
  primaryContainer: '#E3ECFB',
  onPrimaryContainer: '#163C80',
  inversePrimary: '#A9C4F2',
  secondary: '#3F6FB8',
  secondaryContainer: '#E3ECFB',
  onSecondaryContainer: '#163C80',
  background: '#F2F6FC',
  surface: '#F2F6FC',
  surfaceBright: '#F2F6FC',
  surfaceContainerLow: '#E9F0FA',
  surfaceContainer: '#E4ECF8',
  surfaceContainerHigh: '#D9E4F4',
  surfaceVariant: '#D9E4F4',
  outlineVariant: '#D6E1F2',
  brand: '#2F6BD6'
}

const blueDark: Palette = {
  ...darkColors,
  primary: '#8AB4F8',
  onPrimary: '#0A1630',
  primaryContainer: '#16305E',
  onPrimaryContainer: '#D6E4FD',
  inversePrimary: '#2F6BD6',
  secondary: '#8FB0E6',
  secondaryContainer: '#1B3566',
  onSecondaryContainer: '#D6E4FD',
  brand: '#2F6BD6'
}

const charcoal: Palette = {
  ...darkColors,
  primary: '#E8A33D',
  onPrimary: '#1B1C1E',
  primaryContainer: '#3A2E1A',
  onPrimaryContainer: '#F6DDB3',
  inversePrimary: '#8A5A12',
  secondary: '#D4A15A',
  onSecondary: '#1B1C1E',
  secondaryContainer: '#3A3024',
  onSecondaryContainer: '#F3E2C6',
  tertiary: '#A3A7AE',
  onTertiary: '#1B1C1E',
  tertiaryContainer: '#2B2D31',
  onTertiaryContainer: '#D5D7DB',
  background: '#1B1C1E',
  onBackground: '#ECEDEF',
  surface: '#1B1C1E',
  surfaceDim: '#141516',
  surfaceBright: '#34363A',
  surfaceContainerLowest: '#232528',
  surfaceContainerLow: '#26282B',
  surfaceContainer: '#2B2D31',
  surfaceContainerHigh: '#323439',
  surfaceContainerHighest: '#3C3F44',
  surfaceVariant: '#323439',
  onSurface: '#ECEDEF',
  onSurfaceVariant: '#A3A7AE',
  inverseSurface: '#ECEDEF',
  inverseOnSurface: '#1B1C1E',
  outline: '#6B6F76',
  outlineVariant: '#3A3D42',
  placeholder: '#858990',
  field: '#2E3034',
  brand: '#2B2D31',
  onBrand: '#ECEDEF'
}

/** charcoal has no light side */
export const isDarkOnly = (name: PaletteName): boolean => name === 'charcoal'

export function paletteFor(name: PaletteName, isDark: boolean): Palette {
  if (name === 'charcoal') return charcoal
  if (name === 'blue') return isDark ? blueDark : blueLight
  return isDark ? darkColors : lightColors
}

/** the swatch shown in the picker */
export const PALETTE_SWATCH: Record<PaletteName, string> = { navy: '#21364F', blue: '#2F6BD6', charcoal: '#2B2D31' }
