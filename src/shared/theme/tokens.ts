/**
 * Direct port of docs/ui/design-tokens.json — the authoritative,
 * machine-readable numeric source (docs/ui/design-system.md has the
 * rationale). Values are copied, not reinterpreted; do not add a value
 * here that isn't already in that file. `color.dark` stays unpopulated —
 * the source document explicitly defers it (design-system.md §12,
 * tokens.json `color.dark.$status`), not this file's decision to make.
 *
 * v2.0.0 ("Minimal Luxury" reset, superseding the v1.1.0 Material-3-drab
 * palette) — see design-system.md §0 for the full rationale. Same token
 * *shape* as v1.1.0 (every key name below is unchanged, so every
 * component consuming `theme.colors.x` / `theme.radius.x` etc. picks up
 * the new look automatically); only the values changed.
 *
 * Font families: Vazirmatn (Regular/Medium/SemiBold — the three weights
 * design-tokens.json's RTL typography scale actually uses) ships as a
 * bundled asset (assets/fonts/, linked via react-native.config.js) and is
 * wired up below. Geist/Inter (the LTR faces) are still not bundled —
 * AZAR is RTL-first by default (ThemeProvider's `isRTL` defaults to
 * true), so LTR falls back to the system font until those are needed.
 */

/**
 * Warm ivory/charcoal neutrals + two restrained accents (a muted
 * bronze/gold for primary brand actions, a deep emerald for
 * success/positive-money states) instead of the old cool-gray,
 * near-black-on-everything Material palette. Semantic reds/ambers stay
 * close to their conventional hues — they're functional signals, not
 * brand expression, so tests/users read them correctly regardless of
 * theme.
 */
export const lightColors = {
  primary: '#1C1B19',
  onPrimary: '#FAF8F5',
  primaryContainer: '#2B2A27',
  onPrimaryContainer: '#C9C4BA',
  inversePrimary: '#D8D2C4',
  secondary: '#8A6D3B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F1E6D2',
  onSecondaryContainer: '#5C4720',
  tertiary: '#2F4F3E',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#DCEAE1',
  onTertiaryContainer: '#1F3D2E',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',
  success: '#2F6B4F',
  onSuccess: '#FFFFFF',
  successContainer: '#DCEFE3',
  onSuccessContainer: '#1B4632',
  warning: '#8A5A00',
  onWarning: '#FFFFFF',
  warningContainer: '#F6E3C2',
  onWarningContainer: '#4A3200',
  info: '#3D5A73',
  onInfo: '#FFFFFF',
  infoContainer: '#E1E9EF',
  onInfoContainer: '#263B4C',
  background: '#FAF8F5',
  onBackground: '#1C1B19',
  surface: '#FAF8F5',
  surfaceDim: '#E7E3DC',
  surfaceBright: '#FAF8F5',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F5F2EC',
  surfaceContainer: '#EFEBE3',
  surfaceContainerHigh: '#E9E4DA',
  surfaceContainerHighest: '#E3DDD1',
  surfaceVariant: '#E3DDD1',
  onSurface: '#1C1B19',
  onSurfaceVariant: '#57534A',
  inverseSurface: '#302E2A',
  inverseOnSurface: '#F5F2EC',
  outline: '#8A8578',
  outlineVariant: '#D8D2C4'
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

/** Softer, larger corners than v1.1.0 — rounder reads calmer/more premium than the old sharp-ish Material corners. */
export const radius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 12,
  extraLarge: 20,
  full: 9999,
  containerLg: 24
} as const

/**
 * design-tokens.json's `elevation` is CSS box-shadow — translated to
 * RN's shadow* + elevation props. Luxury-minimal cards float on a very
 * soft, low-opacity, large-blur shadow rather than the old harder/darker
 * ones — barely visible in isolation, but reads as "lifted" in context.
 */
export const elevation = {
  level0: { shadowOpacity: 0, elevation: 0 },
  level1: {
    shadowColor: '#1C1B19',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1
  },
  level2: {
    shadowColor: '#1C1B19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  level4: {
    shadowColor: '#1C1B19',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
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
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  titleSm: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  labelMd: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 16 }
} satisfies Record<string, TypographyToken>

/** Line-heights genuinely differ from LTR — Vazirmatn needs more vertical room; bumped further for the airier, more generous "luxury" reading rhythm. */
export const typographyRtl = {
  headlineLgMobile: { fontSize: 24, fontWeight: '600', lineHeight: 38 },
  headlineMd: { fontSize: 24, fontWeight: '500', lineHeight: 38 },
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 29 },
  titleSm: { fontSize: 16, fontWeight: '600', lineHeight: 26 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 29 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 29 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 24 },
  labelMd: { fontSize: 14, fontWeight: '500', lineHeight: 24 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 19 }
} satisfies Record<keyof typeof typographyLtr, TypographyToken>

export type TypographyVariant = keyof typeof typographyLtr

/** Filenames match the bundled assets/fonts/Vazirmatn-*.ttf exactly (Android resolves font family by filename). */
export const vazirmatnFontFamilyByWeight: Record<TypographyToken['fontWeight'], string> = {
  '400': 'Vazirmatn-Regular',
  '500': 'Vazirmatn-Medium',
  '600': 'Vazirmatn-SemiBold',
  '700': 'Vazirmatn-SemiBold' // no Bold weight is bundled — SemiBold is the closest available
}

/**
 * design-tokens.json's `component` block — per-component size/spacing/
 * radius contracts. Card padding is more generous than v1.1.0 (space4/
 * space6 → space5/space8) — breathing room around content is a core part
 * of the "luxury minimal" read, not just a color swap.
 */
export const componentTokens = {
  button: { paddingY: spacing.space4, paddingX: spacing.space6, radius: radius.large },
  textField: { paddingY: spacing.space3, paddingX: spacing.space4, radius: radius.large },
  card: {
    radiusListItem: radius.large,
    radiusDetail: radius.extraLarge,
    paddingDetail: spacing.space8,
    paddingListItem: spacing.space5
  }
} as const
