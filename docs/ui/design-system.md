# AZAR Design System — "Minimal Luxury" (v2.0.0)

## 0. Positioning statement

AZAR CRM is a professional tool real-estate brokers use in front of
clients — every screen is, in effect, a small piece of the brand's
credibility. v1.0/v1.1 of this system was a functional but generic
Material-3-generated look (cool grays, near-pure-black, sharp corners,
heavy shadows): it worked, but read as a prototype, not a product a
broker would be proud to open in front of a client.

**v2.0.0 resets the visual language around one idea: minimal luxury.**
Warm neutral surfaces instead of cool gray, one restrained accent color
used deliberately rather than a rainbow of Material roles, generous
whitespace instead of cramped defaults, soft/large-blur shadows instead
of hard ones, rounder corners instead of sharp ones. Nothing here is
decorative for its own sake — every change earns its place by making the
interface calmer and more confident.

**What did not change**: business logic, data model, navigation
structure, and RTL/Persian-first behavior are untouched by this reset —
this document governs *appearance only*. Every token below keeps the
exact same key name as v1.1.0 (`primary`, `radius.large`, `space6`, …),
so existing components pick up the new look automatically the moment
`src/shared/theme/tokens.ts` changes; this document and that file must
always agree (tokens.ts is copied from `design-tokens.json`, which this
document explains).

## 1. Color System

Two neutral families (ink + warm parchment) plus two restrained accents,
plus the usual semantic set (error/success/warning/info) kept close to
their conventional hues so they still read correctly at a glance.

| Role | Light value | Usage |
|---|---|---|
| `primary` | `#1C1B19` (near-black ink) | Primary buttons, high-emphasis text, active nav state |
| `onPrimary` | `#FAF8F5` | Text/icons on `primary` |
| `secondary` | `#8A6D3B` (muted bronze/gold) | The one deliberate accent — brand marks, selected states, referral code, quick-action badges |
| `onSecondary` | `#FFFFFF` | Text/icons on `secondary` |
| `tertiary` | `#2F4F3E` (deep emerald) | A second, sparingly-used accent — kept visually distinct from `secondary` so two accents never compete on one screen |
| `error` / `success` / `warning` / `info` | `#B3261E` / `#2F6B4F` / `#8A5A00` / `#3D5A73` | Conventional semantic hues — never repurposed as decoration |
| `background` / `surface` | `#FAF8F5` (warm ivory) | Screen background |
| `surfaceContainerLowest` → `surfaceContainerHighest` | `#FFFFFF` → `#E3DDD1` | Card/sheet/input backgrounds, ascending "how raised" |
| `onSurface` / `onSurfaceVariant` | `#1C1B19` / `#57534A` | Primary / secondary text on surfaces |
| `outline` / `outlineVariant` | `#8A8578` / `#D8D2C4` | Hairline borders, disabled/placeholder text |

**Rule**: `secondary` (the bronze accent) is used *deliberately and
sparingly* — one accent moment per screen region, not on every icon. A
screen with six bronze badges reads as noisy, not luxurious. `tertiary`
(emerald) exists specifically so a second, distinct accent is available
without reaching for the bronze twice in one view (see
`StatCard`'s per-stat accent map for the reference usage).

`color.dark` remains explicitly unpopulated — no dark-mode palette has
been designed yet (see §11).

## 2. Typography System

RTL-first: Vazirmatn (Regular/Medium/SemiBold, bundled) is the only
typeface actually shipped; the LTR (Geist/Inter) scale exists in
`design-tokens.json` for parity but falls back to the system font until
those assets are added — not needed while `isRTL` defaults to `true`.

| Token | Size | Weight | RTL line-height | Use |
|---|---|---|---|---|
| `headlineLgMobile` | 24 | 600 | 38 | Screen title |
| `headlineMd` | 24 | 500 | 38 | Detail-screen primary heading |
| `titleMd` | 18 | 600 | 29 | Section title |
| `titleSm` | 16 | 600 | 26 | Card title |
| `bodyLg` | 18 | 400 | 29 | Rare — emphasis body copy |
| `bodyMd` | 16 | 400 | 29 | Default body / field value |
| `bodySm` | 14 | 400 | 24 | Secondary text, helper/error text |
| `labelMd` | 14 | 500 | 24 | Field labels, buttons |
| `labelSm` | 12 | 600 | 19 | Chips, timestamps, tab labels |

RTL line-heights are taller than the LTR scale across the board — a
deliberate widening in v2.0.0 (not just Vazirmatn's own metrics) for a
more generous, less cramped reading rhythm, consistent with the "more
whitespace" positioning above.

## 3. Spacing & Layout

4px base scale, unchanged from v1.1.0 — `space0`(0) … `space16`(64). A
clean numeric scale was never the problem; card/section *padding* was
too tight, which §7.3 corrects at the component-token level
(`card.paddingListItem`/`paddingDetail`), not by inventing a new scale.

## 4. Radius / Shape

Rounder than v1.1.0 across the board — soft corners read calmer:

| Token | v1.1.0 | v2.0.0 |
|---|---|---|
| `small` | 2 | 4 |
| `medium` | 4 | 8 |
| `large` | 8 | 12 |
| `extraLarge` | 12 | 20 |
| `containerLg` | 16 | 24 |
| `full` | 9999 | 9999 (unchanged — pills/avatars/dots) |

## 5. Elevation / Depth

Shadows are soft, low-opacity, and large-blur — a card should feel
*lifted*, not *dropped a shadow on*. Shadow color is the ink primary
(`#1C1B19`) rather than pure black, which keeps shadows from reading
cold/harsh against the warm ivory background.

- `level0`: flat, no shadow (inline/nested content).
- `level1`: default card elevation — 5% opacity, 20px blur, 6px offset.
- `level2`: pressed/focused state — slightly firmer.
- `level4`: modals/sheets — the only level that reads as clearly "above" the page.

## 6. Iconography

Zero-dependency, hand-drawn pure-`View`/border composition (see
`src/shared/components/Icon.tsx`) — no icon font or vector-icon library
is bundled (native-linking risk during a period where getting *any*
Android build working was already fragile; revisit only if that
constraint changes). All glyphs share one stroke-weight formula and one
corner-rounding convention so the set reads as one family regardless of
which glyph is used where. Default tint is `onSurface`; accent icons
(stat badges, quick actions) tint with the matching container's
`on*Container` color from §1.

Sizes: `xs`(16) `sm`(18) `md`(24, default) `lg`(32) `xl`(48).

## 7. Component Standards

### 7.1 Buttons
One primary action per screen/sheet footer maximum. Variants: `primary`
(filled, `primary`/`onPrimary`), `secondary` (outlined, 1px
`outline`), `destructive` (filled, `error`/`onError`), `text` (no
container, underlined label). Minimum 48dp touch target regardless of
visual size (§8). Radius: `radius.large`.

### 7.2 Text Fields
Label above field. States: default (1px `outlineVariant`), focused (1px
`primary`), error (2px `error`), disabled (`surfaceContainerLow` fill,
`outline` text). Radius: `radius.large`. `TextInput`'s optional
`required` prop renders a red `error`-colored asterisk beside the label
— the app-wide required-field indicator (never invent a per-screen
variant of this).

### 7.3 Cards
Two variants: `listItem` (`radius.large`, `paddingListItem` =
`space5`) and `detail` (`radius.extraLarge`, `paddingDetail` =
`space8`) — both more generously padded than v1.1.0. Background:
`surfaceContainerLowest`. Default elevation: `level1`. Use a Card only
when it genuinely groups related information — not as a default wrapper
for every block of text (see §7.7 for how `EmptyState`/`ErrorState`
avoid this trap with an icon badge instead of a bare card).

### 7.4 Segmented Controls / Chips
Track: `surfaceContainerLow`. Selected segment: `primaryContainer` fill +
`onPrimaryContainer` label. Chips: `radius.full`, `paddingY(space1)` ×
`paddingX(space3)`, `labelSm`.

### 7.5 Navigation
Bottom tab bar: 5 items (Home, Files, Matching, Contracts, Profile).
Active state: `secondaryContainer` fill + filled icon, using the shared
`Icon` component (§6) — never a bare label with no icon.

### 7.6 Loading / Progress
`LoadingIndicator` is indeterminate-only (no percentage data exists
anywhere in this app) — `size="large"` for full-screen loads,
`size="small"` for inline section loads (e.g. suggested-matches lists).
Never block the whole screen for a section-level fetch.

### 7.7 Empty States
Centered: icon badge (`Icon` inside a `radius.full` circle on
`surfaceContainerLow`, defaulting to the generic `inbox` glyph) → `titleSm`
heading → `bodySm` supporting text → optional action button. Every list
screen gets one for free from the shared `EmptyState` component — no
screen should invent its own "nothing here" text block.

### 7.8 Error States
Same badge-first layout as §7.7 but on `errorContainer` with the `alert`
glyph, plus an optional retry button. Reserved for operation-level
failures (failed fetch, corrupted data) — inline field-validation errors
use §7.2's error state instead, never this component.

## 8. Touch Targets & Accessibility

Every interactive control — button, icon button, list-item row,
checkbox — has a minimum 48×48dp hit area regardless of its visual size;
the glyph/label is never stretched to fill it. Every `Pressable` carries
`accessibilityRole` and a real (not decorative) `accessibilityLabel`.
Focus/active/error states are distinguished by more than color alone
(border width changes too — see §7.2) so they remain legible under color
vision deficiency.

## 9. Motion

Durations: `fast`(150ms) / `standard`(200ms) / `moderate`(300ms).
Press feedback: scale to `0.98`, no color-only feedback. Success
animations (OTP verification) use React Native's built-in `Animated` API
— no animation library dependency.

## 10. RTL / Persian-First Rules

Persian-first by default (`ThemeProvider`'s `isRTL` defaults to `true`,
not derived from OS locale). RTL correctness means real React Native
layout mirroring (`I18nManager.forceRTL`, automatic `flexDirection: 'row'`
mirroring), not just `textAlign: 'right'` — see `rtl.test.tsx` for the
enforced contract. The one deliberate exception is OTP digit order,
which stays strict left-to-right regardless of RTL (digits are read the
same direction as the SMS containing them) — documented in `OtpInput.tsx`.

## 11. Dark Theme (Deferred)

No dark palette exists yet. `lightColors` is the only populated theme;
`color.dark` in `design-tokens.json` stays an explicit `$status` gap, not
a guessed set of values. A dedicated dark-palette pass (using the same
warm-neutral + bronze/emerald language as §1, inverted) is future work,
not silently bundled into this reset.

## 12. Design Tokens (Machine-Readable)

`docs/ui/design-tokens.json` is the numeric source of truth this
document explains; `src/shared/theme/tokens.ts` is a direct port of it
into TypeScript. Do not edit one without the other.
