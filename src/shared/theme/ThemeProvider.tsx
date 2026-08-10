import React, { createContext, useContext, useMemo } from 'react'
import {
  componentTokens,
  elevation,
  iconSize,
  layoutTokens,
  lightColors,
  motion,
  radius,
  spacing,
  touchTargetMinimum,
  typographyLtr,
  typographyRtl,
  vazirmatnFontFamilyByWeight,
  type TypographyVariant
} from './tokens'

export type Theme = {
  isRTL: boolean
  colors: typeof lightColors
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
    textAlign: 'left' | 'right'
    writingDirection: 'ltr' | 'rtl'
  }
}

function buildTheme(isRTL: boolean): Theme {
  const table = isRTL ? typographyRtl : typographyLtr
  return {
    isRTL,
    colors: lightColors, // color.dark is undefined in design-tokens.json — light is the only theme
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
      // Only Vazirmatn (RTL) is bundled as a real asset — LTR falls back
      // to the system font until Geist/Inter are added.
      fontFamily: isRTL ? vazirmatnFontFamilyByWeight[table[variant].fontWeight] : undefined,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr'
    })
  }
}

const ThemeContext = createContext<Theme | null>(null)

type Props = {
  /**
   * AZAR is Persian-first (design-system.md §10: RTL/Persian first-class
   * from the start) — defaults to RTL rather than following the OS
   * locale, consistent with every screen built so far.
   */
  isRTL?: boolean
  children: React.ReactNode
}

export function ThemeProvider({ isRTL = true, children }: Props): React.JSX.Element {
  const theme = useMemo(() => buildTheme(isRTL), [isRTL])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext)
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return theme
}
