# AZAR Design System — "Minimal Luxury" (v2.2.0)

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

## 0.1 v2.1.0 — Layout hardening (why this section exists)

v2.0.0 corrected color/type/shape but never wrote down a *layout*
contract — page padding, section rhythm, and phone-width behavior were
left as unwritten convention. That gap let a real regression ship: the
Dashboard's KPI row used a `minWidth: 140` + `flex: 1` flex-wrap grid
which is mathematically guaranteed to collapse to **one column** on any
device narrower than ~390px of content width (320/360/375px Android
phones — extremely common), producing an oversized, near-empty card for
each stat. Nothing in v2.0.0 forbade that pattern because no layout rule
existed to forbid it. §13–§15 below close that gap; §7.3 and §7.9 are
updated to point at the new rules. This is a documentation and
implementation correction, not another visual reset — colors, type,
radius, and elevation are unchanged from v2.0.0.

## 1. Color System

v2.2.0 swaps the neutral family only, per explicit user direction: warm
ivory/near-black-warm-ink neutrals → a **cool off-white-gray + charcoal-
black** scale (`background #F6F6F7`, `primary #1E1E20`). The two brand
accents (bronze `secondary`, emerald `tertiary`) and every semantic
color are unchanged — this is a neutral-temperature correction, not
another full reset.

| Role | Light value | Usage |
|---|---|---|
| `primary` | `#1E1E20` (charcoal black) | Primary buttons, high-emphasis text, active nav state |
| `onPrimary` | `#F6F6F7` | Text/icons on `primary` |
| `secondary` | `#8A6D3B` (muted bronze/gold) | The one deliberate accent — brand marks, selected states, referral code, quick-action badges |
| `onSecondary` | `#FFFFFF` | Text/icons on `secondary` |
| `tertiary` | `#2F4F3E` (deep emerald) | A second, sparingly-used accent — kept visually distinct from `secondary` so two accents never compete on one screen |
| `error` / `success` / `warning` / `info` | `#B3261E` / `#2F6B4F` / `#8A5A00` / `#3D5A73` | Conventional semantic hues — never repurposed as decoration |
| `background` / `surface` | `#F6F6F7` (off-white gray) | Screen background |
| `surfaceContainerLowest` → `surfaceContainerHighest` | `#FFFFFF` → `#DADADD` | Card/sheet/input backgrounds, ascending "how raised" |
| `onSurface` / `onSurfaceVariant` | `#1E1E20` / `#57575B` | Primary / secondary text on surfaces |
| `outline` / `outlineVariant` | `#8B8B90` / `#D1D1D4` | Hairline borders, disabled/placeholder text |

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

### 3.1 Named layout tokens (v2.1.0)

The raw `spaceN` scale is a palette, not a contract — every screen
picking its own value by convention is exactly how inconsistent
spacing happens. `theme.layout` (mirrors `design-tokens.json`'s
`layout` block) names the five roles every screen actually needs, and
screens must reference these, not raw `spaceN` values, for these five
purposes:

| Token | Value | Purpose |
|---|---|---|
| `screenPaddingX` | `space6` (24) | Horizontal padding on every top-level screen container — the one number that defines "content max width - safe area" |
| `screenPaddingBottom` | `space8` (32) | Bottom padding on scrollable screens (clears the last section from the bottom nav / thumb) |
| `sectionSpacing` | `space8` (32) | Vertical gap **between** the sections listed in §14 (header / KPIs / actions / activity / secondary) |
| `componentSpacing` | `space3` (12) | Vertical gap **within** a section, between sibling components (e.g. a section heading and its content) |
| `textToElementSpacing` | `space1` (4) | Gap between a piece of text and an immediately adjacent element it's paired with (label → helper text, title → timestamp) |

`sectionSpacing` (32) is deliberately larger than `componentSpacing`
(12) — that ratio is what makes section boundaries readable at a
glance without a divider line. A screen that uses the same gap value
between sections and within them is the "unrelated boxes stacked
vertically" failure mode called out in §14.

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
(`#1E1E20`) rather than pure black, which keeps shadows from reading
harsh against the off-white-gray background.

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

### 6.1 v2.2.0 — glyph audit

Corner rounding on every glyph bumped by one step (e.g. 1→2, 2→3, 3→4)
for a softer, rounder read, consistent with §4's rounder shape scale.
Added `deal` — a flag-on-pole glyph for the Deal/پیگیری pipeline,
replacing a reuse of `matching`'s crossed-chevron glyph for that
purpose. `matching` is the Matching tab's own icon (property/applicant
compatibility); using it a second time for an unrelated concept (the
deal pipeline) made two different ideas share one glyph, which is
exactly the "wrong icon" failure class — every concept gets its own
glyph, glyphs are never reused across unrelated meanings.

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

Card **height is always content-driven** — never set a fixed or
`minHeight` on a Card to force visual uniformity; if cards in a row
look uneven, fix the grid (§13.2), not the card.

### 7.3.1 KPI / stat card grids (v2.1.0)

Any row of small metric cards (Dashboard KPIs and anywhere the same
pattern is reused) is a **fixed 2-column percentage grid**
(`theme.component.statCardGrid`: `columnBasisPercent: '46%'` — not 50%,
to leave headroom for `gap`, which React Native adds on top of
percentage widths rather than subtracting from them — `gap: space3`),
not a `minWidth` + `flex: 1` flex-wrap row. Internally, a KPI card is a
**horizontal** icon-badge + (value, label) layout with `space3` padding
— not the vertical badge-above-number layout with full `card.paddingListItem`
used by other list-item cards — because a KPI card's content is a single
number and a short label, and the default list-item padding/stacking
reads as excess empty space at that content size. A
minWidth-threshold grid collapses to 1 column once content width drops
below `columns × minWidth + gaps` — on this app's phone-only breakpoint
set (§13) that threshold is crossed on ordinary devices, producing an
oversized card with mostly empty space around 3 lines of content. The
2-column percentage grid has no threshold to cross: it is always
exactly 2 columns, at every width in §13, and the card shrinks/grows
with the column, never with its own content.

### 7.4 Segmented Controls / Chips
Track: `surfaceContainerLow`. Selected segment: `primaryContainer` fill +
`onPrimaryContainer` label. Chips: `radius.full`, `paddingY(space1)` ×
`paddingX(space3)`, `labelSm`.

### 7.5 Navigation
Bottom tab bar: 5 items (Home, Files, Matching, Contracts, Profile),
height `layout.bottomNavHeight` (80) **plus the device's bottom
safe-area inset** (`useSafeAreaInsets().bottom`, added to both `height`
and `paddingBottom`) — never a bare literal height. A fixed height with
no inset silently overrides `@react-navigation/bottom-tabs`' own
safe-area-aware sizing, which is exactly what let tab labels render
behind a phone's gesture-navigation bar (reported on a Samsung A06,
which has a tall gesture strip). Every fixed-position element anchored
to a screen edge — bottom tab bar, any future bottom sheet/toolbar —
follows the same rule. Active state: `secondaryContainer`
fill (bronze-tinted, §1) + `onSecondaryContainer` icon/label, using the
shared `Icon` component (§6) — never a bare label with no icon.
**Selection color is always `secondaryContainer`/`onSecondaryContainer`
from §1 — never a one-off color (e.g. a raw green/blue) introduced only
for the nav bar.** If a screenshot or build ever shows a bright,
palette-unaligned active-tab color, that is a stale build or a direct
`backgroundColor` override bypassing `theme.colors`, not an intentional
variant — treat it as a bug, not a design option. The tab bar surface is
`surfaceContainerLowest` with a 1px `outlineVariant` top border, so it
reads as a natural continuation of the page rather than a competing
block.

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

Two sizes: the default (`padding: space8`, `icon.lg`) is for a
**screen-level** empty state (an entire list screen has no rows yet).
A `compact` variant (`theme.component.emptyStateCompact`: `padding:
space5`, `icon.md`) is for an empty state **nested inside a page
section that has other content around it** (e.g. a dashboard
sub-section) — the full-size variant inside a small section produces
the "large blank area for one line of text" failure. Use `compact`
whenever the empty state is not the only thing on the screen.

### 7.8 Error States
Same badge-first layout as §7.7 but on `errorContainer` with the `alert`
glyph, plus an optional retry button. Reserved for operation-level
failures (failed fetch, corrupted data) — inline field-validation errors
use §7.2's error state instead, never this component.

### 7.9 Confirmation Dialogs

`ConfirmDialog` (shared component) replaces the OS-native `Alert.alert`
for every in-app confirmation (logout, delete record) — a dimmed
backdrop (`rgba(30,30,32,0.45)`, the ink primary tinted, tap to cancel)
behind a centered "glass" card: a translucent surface
(`rgba(255,255,255,0.86)`) with a soft light border standing in for a
glass edge highlight, `radius.extraLarge`, and `elevation.level4`. This
is deliberately not a real blurred backdrop — no native blur library is
bundled, consistent with the zero-extra-native-dependency stance
elsewhere in the app (§6) — the translucency plus soft shadow is the
achievable "glass" read without one. Always paired buttons: `cancel`
(secondary) + `confirm` (`primary` or `destructive` per the action).
Reserved for confirmation/destructive-action prompts; not a general
modal/sheet component.

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

## 10. RTL / Persian-First Rules — formal system (v2.1.0)

Persian-first by default (`ThemeProvider`'s `isRTL` defaults to `true`,
not derived from OS locale). RTL correctness means real React Native
layout mirroring (`I18nManager.forceRTL`, automatic `flexDirection: 'row'`
mirroring), not just `textAlign: 'right'` — see `rtl.test.tsx` for the
enforced contract. The one deliberate exception is OTP digit order,
which stays strict left-to-right regardless of RTL (digits are read the
same direction as the SMS containing them) — documented in `OtpInput.tsx`.

RTL is a cross-cutting system, not a per-screen concern — the rules
below apply to every screen and every shared component, not just the
Dashboard:

- **No hardcoded `left`/`right`.** Never use `marginLeft`/`marginRight`,
  `paddingLeft`/`paddingRight`, `left:`/`right:` positioning, or
  `textAlign: 'left'`/`'right'` written directly in a component. Use
  `theme.spacing`/`theme.layout` inside a `flexDirection: 'row'`
  container (React Native mirrors `row` to `row-reverse` automatically
  under `I18nManager.forceRTL`) and `theme.typography(...)`'s
  `textAlign`/`writingDirection`, which are already RTL-aware. This is
  RN's equivalent of CSS logical properties (`margin-inline-start`,
  etc.) — the mirroring is automatic *only* if you never fight it with
  a literal `left`/`right`.
- **Icon placement**: an icon paired with text (chevron, badge, leading
  glyph) sits in the same `row` as the text, positioned by row order,
  never by an absolute offset — row-reversal then handles RTL for free.
  Directional icons (chevrons that imply "back"/"forward") must be
  drawn to flip with the row, not redrawn per-direction.
- **Overflow safety is part of RTL correctness, not a separate
  concern.** Any `Text` acting as a heading/label that shares a `row`
  with a sibling element (a trailing icon, a badge, a chevron) MUST set
  `flexShrink: 1` and, unless the design explicitly allows wrapping to
  a second line, `numberOfLines={1}` + `ellipsizeMode="tail"`. Without
  `flexShrink: 1`, a `Text` node's intrinsic width can push a row past
  the container edge — this is precisely the failure class behind a
  heading being "pushed toward/beyond the edge": the container was
  never too narrow, the text inside it was simply never told it was
  allowed to shrink. This rule applies to every row-with-trailing-icon
  pattern in the app (section headings with an action icon, quick-action
  rows with a trailing chevron, list rows with a trailing timestamp).
- **Minimum horizontal safe area**: every top-level screen uses
  `theme.layout.screenPaddingX` (24) on both sides via its outermost
  container — never 0, never a screen-specific override. Content never
  extends into that padding; a component that needs more room reduces
  its own internal padding, it does not borrow the screen's safe area.
- **Grids and cards** (§7.3.1, §13.2) use percentage-based column
  widths (`flexBasis`), never fixed pixel `minWidth` thresholds, for the
  same reason fixed left/right offsets are banned: a threshold-based
  layout has a breakpoint where it silently changes shape, and RTL
  mirroring makes that breakpoint effect exactly as invisible during
  development (both directions look "fine" until measured at a real
  device width).
- **Forms, dialogs, lists**: label position, helper/error text, and
  field order all follow the same row-order + `theme.typography`
  mirroring — no separate RTL variant is ever hand-authored for a form
  layout that already exists for LTR.

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

## 13. Responsive Rules — phone breakpoints (v2.1.0)

AZAR ships on phones only — the `grid.compact/medium/expanded` block in
§12's tokens is a tablet/desktop system inherited from the Material 3
foundation and does not apply to any screen in this app today (revisit
only if a tablet layout is scoped). What actually governs every screen
is the phone-width regression set:

**320, 360, 375, 390, 412, 430** (px logical width — narrowest common
Android phone through large Android phone).

### 13.1 Non-negotiable behavior at every width above
- Zero horizontal overflow / no horizontal scroll.
- No Persian text is clipped mid-glyph; text that doesn't fit wraps
  (`numberOfLines` unset, default multi-line) or truncates with an
  ellipsis (`numberOfLines={1}` + `ellipsizeMode="tail"`) — never
  overflows its container silently.
- No heading, button, or icon is pushed outside the viewport.
- No button collapses below `touchTarget.minimum` (48dp) — if a
  two-item row genuinely cannot fit at 48dp each at 320px, it stacks to
  one column instead of shrinking below the minimum (§13.2).

### 13.2 When a multi-column layout must become one column
A row-based layout (a KPI grid, an action grid, a paired-field row)
defines its own minimum viable column width up front (e.g. §7.3.1's
KPI grid: 2 columns, always). If a layout's *content itself* — not a
device-width threshold — makes 2 columns unreadable (a label that's
unavoidably longer than a column can hold even after `numberOfLines`
truncation is applied, e.g. a 48dp-tall button whose label would
truncate to nothing useful), the fix is to reduce to 1 column
*ⓐ for that specific instance* by explicit design decision, not by
attaching a generic `minWidth` to the shared component — a shared
component's default is always the fixed-percentage grid from §7.3.1/§15.

### 13.3 Testing expectation
Because this project has no visual/emulator screenshot tooling wired
into the current session, responsive validation for this pass is
static: every layout touched in this correction was checked
arithmetically against all six widths (see §18 Implementation Review /
the delivery report's Visual Validation section for the actual numbers
run for the Dashboard KPI grid). A real device/emulator screenshot pass
at these six widths remains an open follow-up — see the delivery
report's "Remaining issues" list.

## 14. Information Hierarchy & Screen Composition

Every screen has a small number of sections, and those sections are not
equally important. A screen where every section looks the same weight
(same card style, same spacing before and after, same heading size)
reads as "unrelated boxes stacked vertically" — that flatness is itself
a design defect, independent of any single section's own layout.

Standard section order and role, applied to the Dashboard first and to
any future screen with a similar shape:

1. **Header / identity** — who is using the app right now (avatar +
   greeting), and the one navigation affordance to account/settings.
   Not a card; sits directly on the screen background.
2. **Primary overview / KPIs** — the small number of headline metrics
   that answer "what does my business look like right now." §7.3.1's
   fixed 2-column grid. No section heading text needed — the header
   above already establishes context.
3. **Primary actions** — the small number of things the user most
   often needs to *do* next (create a record, jump to the most active
   list). Gets a `titleMd` section heading (§2) since it's the first
   section that needs one.
4. **Important activity / follow-ups** — time-sensitive items the user
   must not miss (upcoming reminders). Ranked above general activity
   because it can require action; uses the `compact` EmptyState (§7.7)
   when there's nothing due.
5. **Secondary information** — general historical context (recent
   activity log) that's useful but never time-critical; sits last in
   scroll order precisely because it's the section most safe to require
   a scroll to reach.
6. **Persistent navigation** — the bottom tab bar (§7.5), always
   present, never part of the scrollable content.

Sections use `theme.layout.sectionSpacing` (32) between them and
`theme.layout.componentSpacing` (12) inside them (§3.1) — the visible
gap between section 2 and section 3 is meaningfully larger than the gap
between a section's own heading and its content, which is what makes
the hierarchy above legible without relying on card borders to do the
separating.

## 15. Component Contracts — Quick Actions

`QuickAction` / `QuickActionGrid` (Dashboard's "primary actions"
section, §14 role 3):

- **Layout**: a single-column vertical list of full-width rows, each a
  `Card` (`listItem` variant) containing icon badge → label → trailing
  chevron in a `row`. This is a deliberate choice over a 2-column grid:
  action labels in Persian ("افزودن پرونده ملکی") are long enough that a
  2-column grid forces truncation or wrapping on most phone widths,
  while a full-width row gives every label room to render on one line
  at every width in §13's set. A 2-column *icon-only* variant may be
  introduced later (§FUTURE) but is not the current contract.
- **Row height**: `theme.touchTargetMinimum` (48dp) minimum, driven by
  icon badge + padding — never shorter.
- **Label**: `labelMd` typography, `flexShrink: 1`, `numberOfLines={1}`
  + `ellipsizeMode="tail"` (§10's row-overflow rule applies here by
  name, since this is exactly a text-sharing-a-row-with-a-trailing-icon
  case).
- **Icon badge**: `radius.full` circle, `secondaryContainer` fill,
  fixed size (`iconSize.xl * 0.6`) — does not grow/shrink with the row.
- **Spacing between rows**: `componentSpacing` (12, §3.1).
- **Touch target**: the entire row is the `Pressable`, not just the
  label or icon (§8).
