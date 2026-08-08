/**
 * Minimal subset of docs/ui/design-tokens.json needed for Phase 8's
 * screens — light mode only (dark is explicitly deferred in the design
 * system itself). Not a component library (that's Phase 11); just the
 * numeric/color values so these screens don't invent their own spacing
 * or colors. Font loading (Geist/Inter/Vazirmatn) is also Phase 11 —
 * these use system default fonts with the documented sizes/weights until
 * then.
 */
export const colors = {
  primary: '#000101',
  onPrimary: '#ffffff',
  background: '#f8f9fa',
  onBackground: '#191c1d',
  surfaceContainerLowest: '#ffffff',
  onSurfaceVariant: '#44474a',
  outline: '#75777a',
  outlineVariant: '#c5c6ca',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6'
} as const

export const spacing = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48
} as const

export const radius = {
  medium: 4,
  large: 8,
  extraLarge: 12
} as const

export const typography = {
  headlineLgMobile: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  titleMd: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelMd: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 }
} as const

export const touchTargetMinimum = 48
