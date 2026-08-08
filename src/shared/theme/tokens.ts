/**
 * Direct port of docs/ui/design-tokens.json — the authoritative,
 * machine-readable numeric source (docs/ui/design-system.md has the
 * rationale). Values are copied, not reinterpreted; do not add a value
 * here that isn't already in that file. `color.dark` stays unpopulated —
 * the source document explicitly defers it (design-system.md §12,
 * tokens.json `color.dark.$status`), not this file's decision to make.
 *
 * Font families (Geist/Inter/Vazirmatn) are named here but not yet
 * loaded as bundled assets — no font files exist in this repo yet. Every
 * typography token still carries its correct size/weight/line-height per
 * direction (LTR vs RTL line-heights genuinely differ), so switching in
 * real fonts later only touches `fontFamily`, nothing else.
 */

export const lightColors = {
  primary: '#000101',
  onPrimary: '#ffffff',
  primaryContainer: '#1a1c1e',
  onPrimaryContainer: '#838486',
  inversePrimary: '#c6c6c9',
  secondary: '#3b6934',
  onSecondary: '#ffffff',
  secondaryContainer: '#b9eeab',
  onSecondaryContainer: '#3f6d38',
  tertiary: '#000000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#001f26',
  onTertiaryContainer: '#618a96',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  success: '#3b6934',
  onSuccess: '#ffffff',
  successContainer: '#b9eeab',
  onSuccessContainer: '#3f6d38',
  warning: '#8a5000',
  onWarning: '#ffffff',
  warningContainer: '#ffddb3',
  onWarningContainer: '#6b3d00',
  info: '#001f26',
  onInfo: '#ffffff',
  infoContainer: '#001f26',
  onInfoContainer: '#618a96',
  background: '#f8f9fa',
  onBackground: '#191c1d',
  surface: '#f8f9fa',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  surfaceVariant: '#e1e3e4',
  onSurface: '#191c1d',
  onSurfaceVariant: '#44474a',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  outline: '#75777a',
  outlineVariant: '#c5c6ca'
} as const

export const spacing = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64
} as const

export const radius = {
  none: 0,
  small: 2,
  medium: 4,
  large: 8,
  extraLarge: 12,
  full: 9999,
  containerLg: 16
} as const

/** design-tokens.json's `elevation` is CSS box-shadow — translated to RN's shadow* + elevation props. */
export const elevation = {
  level0: { shadowOpacity: 0, elevation: 0 },
  level1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 1
  },
  level2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  level4: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 4
  }
} as const

export const iconSize = {
  xs: 16,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48
} as const

export const motion = {
  durationFast: 150,
  durationStandard: 200,
  durationModerate: 300,
  pressScale: 0.98
} as const

export const touchTargetMinimum = 48

type TypographyToken = {
  fontSize: number
  fontWeight: '400' | '500' | '600' | '700'
  lineHeight: number
}

export const typographyLtr = {
  headlineLgMobile: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  headlineMd: { fontSize: 24, fontWeight: '500', lineHeight: 32 },
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  titleSm: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  labelMd: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 16 }
} satisfies Record<string, TypographyToken>

/** Line-heights genuinely differ from LTR — Vazirmatn needs more vertical room. */
export const typographyRtl = {
  headlineLgMobile: { fontSize: 24, fontWeight: '600', lineHeight: 37 },
  headlineMd: { fontSize: 24, fontWeight: '500', lineHeight: 37 },
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 28 },
  titleSm: { fontSize: 16, fontWeight: '600', lineHeight: 25 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 28 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 23 },
  labelMd: { fontSize: 14, fontWeight: '500', lineHeight: 23 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 18 }
} satisfies Record<keyof typeof typographyLtr, TypographyToken>

export type TypographyVariant = keyof typeof typographyLtr

/** design-tokens.json's `component` block — per-component size/spacing/radius contracts. */
export const componentTokens = {
  button: { paddingY: spacing.space4, paddingX: spacing.space6, radius: radius.large },
  textField: { paddingY: spacing.space3, paddingX: spacing.space4, radius: radius.large },
  card: {
    radiusListItem: radius.large,
    radiusDetail: radius.extraLarge,
    paddingDetail: spacing.space6,
    paddingListItem: spacing.space4
  }
} as const
