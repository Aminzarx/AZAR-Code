import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { savedAppearanceMode, saveAppearanceMode, type AppearanceMode } from './appearance'
import {
  componentTokens,
  elevation,
  iconSize,
  layoutTokens,
  darkColors,
  lightColors,
  motion,
  radius,
  spacing,
  statusTones,
  touchTargetMinimum,
  typographyLtr,
  typographyRtl,
  rtlFontFamilyByWeight,
  rtlHeadingFontFamilyByWeight,
  HEADING_VARIANTS,
  type Palette,
  type StatusTone,
  type TypographyVariant
} from './tokens'

export type Theme = {
  isRTL: boolean
  /** Amin #5055: night mode is on */
  isDark: boolean
  colors: Palette
  spacing: typeof spacing
  radius: typeof radius
  elevation: typeof elevation
  iconSize: typeof iconSize
  motion: typeof motion
  touchTargetMinimum: number
  component: typeof componentTokens
  layout: typeof layoutTokens
  typography: (variant: TypographyVariant) => {
    fontSize: number
    fontWeight: '400' | '500' | '600' | '700'
    lineHeight: number
    fontFamily?: string
    textAlign: 'left'
    writingDirection: 'ltr' | 'rtl'
  }
  /** Resolves one of the 5 status tones (design-system.md §7 Status System) to real theme colors. */
  status: (tone: StatusTone) => { background: string; foreground: string }
}

function buildTheme(isRTL: boolean, isDark: boolean): Theme {
  const table = isRTL ? typographyRtl : typographyLtr
  const colors = isDark ? darkColors : lightColors
  return {
    isRTL,
    isDark,
    colors,
    spacing,
    radius,
    elevation,
    iconSize,
    motion,
    touchTargetMinimum,
    component: componentTokens,
    layout: layoutTokens,
    typography: (variant) => ({
      ...table[variant],
      // Persian fonts are bundled (Vazirmatn, IRANYekan for headings) — LTR falls back
      // to the system font until Geist/Inter are added.
      fontFamily: isRTL
        ? (HEADING_VARIANTS.has(variant) ? rtlHeadingFontFamilyByWeight : rtlFontFamilyByWeight)[table[variant].fontWeight]
        : undefined,
      // v1.5.0 (Amin #4796): React Native on Android swaps textAlign left/right for <Text> under RTL,
      // so 'left' is the START edge: the right side in Persian. 'right' used to send every wrapped
      // line to the left edge. <TextInput> does not swap; inputs set their own physical alignment.
      textAlign: 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr'
    }),
    status: (tone) => {
      const tokenPair = statusTones[tone]
      return {
        background: colors[tokenPair.background],
        foreground: colors[tokenPair.foreground]
      }
    }
  }
}

const ThemeContext = createContext<Theme | null>(null)
const AppearanceContext = createContext<{ mode: AppearanceMode; setMode: (mode: AppearanceMode) => void } | null>(
  null
)

type Props = {
  /**
   * AZAR is Persian-first (design-system.md §10: RTL/Persian first-class
   * from the start) — defaults to RTL rather than following the OS
   * locale, consistent with every screen built so far.
   */
  isRTL?: boolean
  /** tests: a fixed mode instead of the one saved on the phone */
  initialMode?: AppearanceMode
  children: React.ReactNode
}

export function ThemeProvider({ isRTL = true, initialMode, children }: Props): React.JSX.Element {
  const [mode, setModeState] = useState<AppearanceMode>(() => initialMode ?? savedAppearanceMode())
  const system = useColorScheme()
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark')
  const theme = useMemo(() => buildTheme(isRTL, isDark), [isRTL, isDark])
  const setMode = useCallback((next: AppearanceMode) => {
    saveAppearanceMode(next)
    setModeState(next)
  }, [])
  const appearance = useMemo(() => ({ mode, setMode }), [mode, setMode])
  return (
    <AppearanceContext.Provider value={appearance}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </AppearanceContext.Provider>
  )
}

/** Amin #5055: the light/dark choice and its setter (saved on the phone) */
export function useAppearance(): { mode: AppearanceMode; setMode: (mode: AppearanceMode) => void } {
  const appearance = useContext(AppearanceContext)
  if (!appearance) {
    throw new Error('useAppearance must be used within a ThemeProvider')
  }
  return appearance
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext)
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return theme
}
