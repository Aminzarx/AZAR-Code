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
 * v3.0.0 "KSS" (Amin #4180/#4205/#4211): the colours of kssx.ir (KSS UI
 * tokens) so the app and the site read as one product. Brand navy
 * #21364F is the site's accent; ink #0F172A, the slate neutrals, and the
 * green/amber/red/blue status families are the site's own values. Same
 * token shape as v2.x, plus `placeholder` (the site's field hint colour).
 */
export const lightColors = {
  primary: '#21364F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EDF1F6',
  onPrimaryContainer: '#21364F',
  inversePrimary: '#AEBED4',
  secondary: '#4A6383',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#EDF1F6',
  onSecondaryContainer: '#21364F',
  tertiary: '#64748B',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F1F5F9',
  onTertiaryContainer: '#334155',
  error: '#DC2626',
  onError: '#FFFFFF',
  errorContainer: '#FDECEC',
  onErrorContainer: '#991B1B',
  success: '#16A34A',
  onSuccess: '#FFFFFF',
  successContainer: '#E9FBF0',
  onSuccessContainer: '#166534',
  warning: '#D97706',
  onWarning: '#FFFFFF',
  warningContainer: '#FEF3E2',
  onWarningContainer: '#92400E',
  info: '#2563EB',
  onInfo: '#FFFFFF',
  infoContainer: '#EFF6FF',
  onInfoContainer: '#1E40AF',
  background: '#F8FAFC',
  onBackground: '#0F172A',
  surface: '#F8FAFC',
  surfaceDim: '#E2E8F0',
  surfaceBright: '#F8FAFC',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F1F5F9',
  surfaceContainer: '#EEF2F6',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',
  surfaceVariant: '#E2E8F0',
  onSurface: '#0F172A',
  onSurfaceVariant: '#64748B',
  inverseSurface: '#0F172A',
  inverseOnSurface: '#F1F5F9',
  outline: '#CBD5E1',
  outlineVariant: '#E2E8F0',
  placeholder: '#94A3B8',
  /** Amin #5242: the fill of form controls (fields, chips, steppers), its own step so it can differ from cards */
  field: '#FFFFFF',
  /** Amin #5055: the navy brand surfaces (invite card, welcome header, the mark) stay navy in both modes */
  brand: '#21364F',
  onBrand: '#FFFFFF'
} as const

/** every colour role; the light and dark palettes fill the same roles */
export type Palette = { readonly [K in keyof typeof lightColors]: string }

/**
 * Amin #5055: night mode. The same roles on the site's dark slate (#0B1220 ink-black, the slate steps up for
 * raised surfaces); the navy brand turns into its light tint so it reads on dark. Every text/background pair the
 * screens use keeps WCAG AA (4.5:1; checked in __tests__/contrast.test.ts).
 */
export const darkColors: Palette = {
  primary: '#AEBED4',
  onPrimary: '#0B1220',
  primaryContainer: '#1C2A3D',
  onPrimaryContainer: '#DCE4EE',
  inversePrimary: '#21364F',
  secondary: '#9FB3CC',
  onSecondary: '#0B1220',
  secondaryContainer: '#22324A',
  onSecondaryContainer: '#DCE4EE',
  tertiary: '#94A3B8',
  onTertiary: '#0B1220',
  tertiaryContainer: '#1E293B',
  onTertiaryContainer: '#CBD5E1',
  error: '#F87171',
  onError: '#0B1220',
  errorContainer: '#3A1619',
  onErrorContainer: '#FECACA',
  success: '#4ADE80',
  onSuccess: '#0B1220',
  successContainer: '#0F2E1C',
  onSuccessContainer: '#BBF7D0',
  warning: '#FBBF24',
  onWarning: '#0B1220',
  warningContainer: '#33240A',
  onWarningContainer: '#FDE68A',
  info: '#60A5FA',
  onInfo: '#0B1220',
  infoContainer: '#0F2340',
  onInfoContainer: '#BFDBFE',
  background: '#0B1220',
  onBackground: '#E2E8F0',
  surface: '#0B1220',
  surfaceDim: '#070C16',
  surfaceBright: '#26344E',
  // Amin #5242: cards lift clearly off the page, controls lift off the cards, borders are visible
  surfaceContainerLowest: '#18243A',
  surfaceContainerLow: '#1B273D',
  surfaceContainer: '#202D45',
  surfaceContainerHigh: '#26344E',
  surfaceContainerHighest: '#31405C',
  surfaceVariant: '#26344E',
  onSurface: '#E2E8F0',
  onSurfaceVariant: '#9AA8BC',
  inverseSurface: '#E2E8F0',
  inverseOnSurface: '#0F172A',
  outline: '#62738D',
  outlineVariant: '#2E3D57',
  placeholder: '#7D8BA1',
  field: '#25344F',
  brand: '#21364F',
  onBrand: '#FFFFFF'
}

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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1
  },
  level2: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  level4: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 4
  }
} as const

// v2.8.4: bumped up one step from 16/18/24/32/48 — icons read a little
// too small against their surrounding text/touch targets.
export const iconSize = {
  xs: 18,
  sm: 20,
  md: 26,
  lg: 34,
  xl: 52
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

/**
 * Line-heights genuinely differ from LTR — Persian text needs more vertical
 * room than the Geist/Inter LTR scale — but v2.9.0 trims the excess back
 * down from v2.0.0's flat +20-34% "airy luxury" widening (which read as
 * too much dead space for a professional CRM used all day) to a tighter
 * +8-15% over the LTR scale, still comfortably above what the Persian font's
 * diacritics/vertical metrics actually need.
 */
export const typographyRtl = {
  headlineLgMobile: { fontSize: 24, fontWeight: '600', lineHeight: 34 },
  headlineMd: { fontSize: 24, fontWeight: '500', lineHeight: 34 },
  titleMd: { fontSize: 18, fontWeight: '600', lineHeight: 27 },
  titleSm: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 29 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 26 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 22 },
  labelMd: { fontSize: 14, fontWeight: '500', lineHeight: 22 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 18 }
} satisfies Record<keyof typeof typographyLtr, TypographyToken>

export type TypographyVariant = keyof typeof typographyLtr

/**
 * Filenames match the bundled assets/fonts/*.ttf exactly (Android resolves font family by filename).
 * v1.5.0 (Amin #4632): Vazirmatn everywhere, IRANYekan (the kssx.ir v2 font) for headings.
 * Amin #5174: the Vazirmatn files are its «Farsi-Digits» build (vazirmatn/misc/Farsi-Digits), which draws 0–9 as
 * Persian digits, so a number shows Persian the moment it is typed, before the input converts it.
 */
export const rtlFontFamilyByWeight: Record<TypographyToken['fontWeight'], string> = {
  '400': 'Vazirmatn-Regular',
  '500': 'Vazirmatn-Medium',
  '600': 'Vazirmatn-Bold',
  '700': 'Vazirmatn-Bold'
}

export const rtlHeadingFontFamilyByWeight: Record<TypographyToken['fontWeight'], string> = {
  '400': 'IRANYekan-Regular',
  '500': 'IRANYekan-Medium',
  '600': 'IRANYekan-Bold',
  '700': 'IRANYekan-Bold'
}

/** The variants drawn in the heading font: page and section titles. */
export const HEADING_VARIANTS: ReadonlySet<TypographyVariant> = new Set<TypographyVariant>([
  'headlineLgMobile',
  'headlineMd',
  'titleMd'
])

/**
 * design-tokens.json's `component` block — per-component size/spacing/
 * radius contracts. Card padding is more generous than v1.1.0 (space4/
 * space6 → space5/space8) — breathing room around content is a core part
 * of the "luxury minimal" read, not just a color swap.
 */
export const componentTokens = {
  // v2.9.1: paddingX tightened from space6(24) — gave button labels more
  // usable width in tight multi-button rows (e.g. three side-by-side
  // action buttons), which previously wrapped a two-word label onto two
  // lines.
  button: { paddingY: spacing.space4, paddingX: spacing.space4, radius: radius.large },
  textField: { paddingY: spacing.space3, paddingX: spacing.space4, radius: radius.large },
  card: {
    radiusListItem: radius.large,
    radiusDetail: radius.extraLarge,
    // v2.9.0: tightened from space8/space5 — the prior "minimal luxury"
    // padding was tuned for an airy boutique feel; a professional CRM
    // used all day benefits from a denser business-tool rhythm instead.
    paddingDetail: spacing.space6,
    paddingListItem: spacing.space4
  },
  /**
   * design-system.md §13 — KPI/stat rows are a fixed 2-column percentage
   * grid, never a minWidth-threshold flex-wrap (that collapses to 1 column
   * below ~390px content width and produces oversized near-empty cards).
   */
  statCardGrid: {
    columns: 2,
    // v2.8.5: explicit literal 10px per direct user request, not a value
    // from the space* scale — space1(4) (the v2.8.1 value) actually read
    // as too tight once the cards themselves grew a bit (see StatCard's
    // padding bump in the same pass), the opposite complaint from
    // v2.7.2/v2.8.1.
    gap: 10,
    // 47%, not 50% — leaves headroom for `gap` (RN adds gap on top of
    // percentage widths) so two columns never overflow at the narrowest
    // supported phone width (320px); nudged back down from 48% now that
    // `gap` grew to 10px, so the pair still fills the row tightly instead
    // of overflowing. See design-tokens.json for the math.
    columnBasisPercent: '47%'
  },
  /** Nested-in-a-section empty state (e.g. dashboard sub-section) — see design-system.md §7.7/§15. */
  emptyStateCompact: {
    padding: spacing.space5,
    iconSize: iconSize.md
  },
  /** design-system.md §7 (v2.4.0 redesign) — small tonal pill, never a saturated solid fill. */
  statusBadge: {
    paddingY: spacing.space1,
    paddingX: spacing.space3,
    radius: radius.full,
    gap: spacing.space1
  },
  /** design-tokens.json's `component.bottomSheet` — used by the list-screen filter sheet (§7.9-style modal presentation, bottom-anchored). */
  bottomSheet: {
    radiusCompact: radius.containerLg,
    maxWidthDesktop: 480,
    handleWidth: 40,
    handleHeight: 4
  }
} as const

/**
 * design-system.md §7 (v2.4.0) — the Status system's five tones. Every
 * status badge in the app (property, applicant, deal, contract, reminder)
 * maps its underlying state into exactly one of these five tones instead
 * of picking a color per screen — this is what keeps "color has meaning"
 * true instead of becoming decoration. Reuses the existing Material
 * container/on-container role pairs (no new hex values), so this table
 * is theme-swap-safe: a future `color.dark` palette only needs to repoint
 * these five role names, every status badge in the app updates for free.
 */
export const statusTones = {
  /** Healthy/default active state — nothing needs attention. */
  positive: { background: 'successContainer', foreground: 'onSuccessContainer' },
  /** Needs the broker's attention soon, but isn't urgent/broken. */
  attention: { background: 'warningContainer', foreground: 'onWarningContainer' },
  /** Something is actively in motion (a deal in progress, a match found). */
  inProgress: { background: 'infoContainer', foreground: 'onInfoContainer' },
  /** A brand-relevant highlight — reserved for the rare "this is the one" moment (won deal, best match). */
  highlight: { background: 'secondaryContainer', foreground: 'onSecondaryContainer' },
  /** Inactive/archived/closed — deliberately the lowest-emphasis tone, never red. */
  neutral: { background: 'surfaceContainerHigh', foreground: 'onSurfaceVariant' }
} as const satisfies Record<
  string,
  { background: keyof typeof lightColors; foreground: keyof typeof lightColors }
>

export type StatusTone = keyof typeof statusTones

/**
 * design-system.md §13 — named layout tokens so every screen shares one
 * page-composition contract instead of each screen picking a spacing
 * value from the raw scale by convention/memory.
 */
export const layoutTokens = {
  screenPaddingX: spacing.space6,
  // v2.9.0: tightened from space8 (32) — denser professional-CRM rhythm,
  // see componentTokens.card's paddingDetail/paddingListItem note above.
  screenPaddingBottom: spacing.space6,
  sectionSpacing: spacing.space6,
  componentSpacing: spacing.space3,
  textToElementSpacing: spacing.space1,
  topAppBarHeight: 64,
  bottomNavHeight: 80
} as const

/** design-system.md §13 — required phone-width regression set; every screen must render with zero horizontal overflow at all six. */
export const phoneBreakpoints = [320, 360, 375, 390, 412, 430] as const
