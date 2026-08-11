# AZAR Design System — "Minimal Luxury" (v2.8.5)

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

## 0.2 v2.5.0 — Professional CRM redesign (why this section exists)

v2.0–v2.3 fixed color, layout, and RTL correctness, but the app still
reads as a **functional CRUD tool**, not a **professional CRM a broker
is proud to open in front of a client**. The gap isn't decoration —
it's that no screen tells the broker what to *do*. v2.5.0 is a
UI/UX-only redesign (business logic, data model, and navigation
structure are unchanged except where a screen genuinely needed a new
*read* query to show already-existing data, e.g. reading a property's
linked deals to show its real status — never a new business rule) built
around eight principles:

1. **Information before decoration.** Real data earns pixels before
   any visual flourish does.
2. **Action over navigation.** Every screen answers "what do I do now?",
   not just "what exists?".
3. **One visual focus per section.** A section with two loud things has
   zero visual foci, not two.
4. **Not everything is a Card.** A screen is composed from Canvas,
   Surface, List Row, Tonal Surface, Card, Divider, and whitespace —
   `Card` is reserved for content that genuinely needs a raised,
   bounded container, not the default wrapper for every block.
5. **Color has meaning.** Bronze (`secondary`) is a rare brand accent,
   not a decoration — reserved for the single most important action or
   highlight in a view. See §6.5 Status System for how state colors
   (success/warning/info/neutral) are used consistently instead of
   per-screen guesswork.
6. **Progressive disclosure.** Primary information (what the broker
   needs in 3 seconds) renders first and largest; secondary information
   is smaller/lower; supporting information (metadata, timestamps) is
   quietest and last.
7. **Mobile-first.** Every layout decision is made for a 320–430px
   phone first; nothing is designed for a tablet/desktop width and then
   shrunk down.
8. **CRM-first.** Every screen serves one step of ثبت → پیدا کردن →
   تطبیق → پیگیری → معامله (register → find → match → follow up →
   close) — a screen that doesn't visibly serve one of these steps is
   the wrong screen, not just an unstyled one.

**Definition of done for any v2.5.0 screen** (§28's audit, condensed):
a broker looking at the screen for 3 seconds can answer *where am I*,
*what's the most important information here*, and *what can I do right
now* — without reading every line of text. If any of those three isn't
obvious, the screen isn't done, no matter how polished it looks.

**UI overload is explicitly banned**: card-inside-card, more than one
loud accent color in a single view, more than one primary CTA in a
single view, bold-everything (bold means nothing if everything is
bold), center-aligning body content by default, and wrapping content in
a container just because every other block has one.

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

**v2.8.0 — switched to `react-native-vector-icons` (Ionicons font).**
The previous hand-drawn pure-`View`/border composition kept shipping
visibly wrong shapes across multiple fix rounds (broken tab icons, a
crude 'inbox' glyph, etc.) because every glyph was redrawn from scratch
by eye instead of coming from a real, professionally designed set. That
zero-dependency approach was chosen early on to avoid native-linking
risk during a period where getting *any* Android build working was
fragile; that constraint no longer holds (`react-native-svg` and
`react-native-camera-kit` are already linked and building successfully),
so there's no remaining reason to hand-draw icons. `Icon.tsx` now maps
each `IconName` to an Ionicons glyph name and renders it via
`react-native-vector-icons/Ionicons`; `android/app/build.gradle` links
only the `Ionicons.ttf` font (not the whole bundled font set) via
`fonts.gradle`. Default tint is `onSurface`; accent icons (stat badges,
quick actions) tint with the matching container's `on*Container` color
from §1.

Sizes: `xs`(16) `sm`(18) `md`(24, default) `lg`(32) `xl`(48).

This document deliberately does **not** enumerate which glyph maps to
which screen/concept, or hold a running catalogue of icon names — that
mapping lives in code (`Icon.tsx`'s glyph switch and each call site),
where it can't drift out of sync with what's actually shipped, and
where it's someone's job to keep it correct as screens change. What
this document owns is the *rules* every glyph choice must satisfy:

- **One glyph per concept, never reused across unrelated meanings.**
  Two different ideas sharing one glyph (e.g. a tab's own icon reused
  for an unrelated stat/action elsewhere) is a defect — pick or draw a
  distinct glyph instead. This is the standard the whole set is held
  to; it's not a one-time audit item to check off.
- **The glyph must depict the concept it labels**, recognizably, at a
  glance, at `md` size — not an abstract or approximate stand-in.
  Prefer a real object/action metaphor (a flag for a pipeline stage, a
  document for a file, a person for a contact) over a generic shape.
- **Directional glyphs mirror under RTL** (§10); non-directional
  glyphs never need a per-direction variant.
- Icons are never load-bearing on their own for meaning — every
  icon-only interactive control still carries a real
  `accessibilityLabel` (§8), and every icon paired with a label in a
  row stays paired with that label, never presented alone as the sole
  identifier of an action.

## 6.5 Status System (v2.5.0)

Every entity with a state (property, applicant, deal) shows it through
one shared `StatusBadge` component (`src/shared/components/StatusBadge.tsx`)
— never a bespoke colored `Text`/chip built per screen. A status is a
small tonal pill (dot + label), never a saturated solid fill, never
bold, never larger than `labelSm`.

`StatusBadge` takes a `tone`, not a raw color — one of exactly 5 tones
(`theme.status(tone)` in `src/shared/theme/tokens.ts`'s `statusTones`,
each reusing an existing Material container/on-container role pair, no
new hex values):

- **positive** (success green) — healthy default state, nothing needs
  attention (e.g. an active property with no open deal).
- **attention** (warning amber) — needs the broker's attention soon,
  not broken (e.g. an applicant with an overdue follow-up reminder).
- **inProgress** (info blue) — something is actively moving (a deal in
  an open stage against this property/applicant).
- **highlight** (bronze) — reserved for the rare "this is the one"
  moment (a won deal). Never used for routine state.
- **neutral** (gray) — archived/inactive/closed. Deliberately the
  *lowest*-emphasis tone — archived is not an error, so it is never red.

**Property status** (derived, not just the raw DB `active`/`archived`
column): بایگانی (archived → neutral) if archived; otherwise, if the
property has any deal in `current_stage = 'won'` → معامله‌شده
(highlight); otherwise if it has any deal in an open stage → در حال
معامله (inProgress); otherwise فعال (positive). This reuses
`DealRepository.getByProperty(propertyId)`, an existing read method —
no schema change. **"منقضی" (expired) is deliberately not implemented**:
no expiry-date field exists anywhere in the schema, and inventing an
expiry status with nothing behind it would violate Principle 1
(information before decoration) — a status badge that isn't backed by
real data is decoration, not information. Revisit only if/when the
data model gains an actual expiry concept.

**Applicant status**: غیرفعال (archived → neutral) if archived;
otherwise, if the applicant has any incomplete reminder
(`isDone: false`) whose `remindAt` has passed → نیازمند پیگیری
(attention) — this takes priority over deal state, since an overdue
follow-up is the most urgent signal; otherwise if any deal in
`current_stage = 'won'` → معامله‌شده (highlight); otherwise if any deal
in an open stage → در حال تطبیق (inProgress); otherwise فعال (positive).
Uses the existing `DealRepository.getByApplicant(applicantId)` and the
existing reminder `propertyId`/`applicantId` linkage — no schema change.

List screens show only the cheap base status (فعال/بایگانی from the
DB column directly) to avoid an N+1 query per row; the richer derived
status (with deal/reminder context) is computed only on Detail screens,
where a single entity's related records are one cheap query away.

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

#### 7.2.1 Money fields
A price/budget field's quick-magnitude chips scale the digits already
typed (append zeros) — they do not add a flat amount, so their label
must read as scaling, never as addition. Real-estate prices in this
app are effectively always stated in میلیون/میلیارد, so the chip set
is exactly two: **میلیون** (×10⁶) and **میلیارد** (×10⁹) — no
هزار/ده‌هزار/صد‌هزار chips, which added choices without adding real
usefulness at this app's price scale. Label format is the literal
zero-group the chip appends, comma-grouped (`"000,000"` for میلیون,
`"000,000,000"` for میلیارد) rather than a Persian word — the digit
groups show unambiguously what happens to the number when tapped,
which a word name does not.

#### 7.2.2 Search fields
A list screen's search field matches every attribute a user would
plausibly search by for that entity — for Property/Applicant that
includes price, not just title/city/address/phone. A search field that
silently ignores a visible, prominent field (price) reads as broken,
not as "not supported."

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

**v2.7.1 attempted a fix that didn't actually work — v2.8.0 replaces
it with one verified against the library's own source.** After the
exhaustive v2.4.0 per-file `alignSelf` audit, RTL was still reported
broken on fresh installs and app updates. The cause was correctly
diagnosed as upstream of any component code: `I18nManager.forceRTL(true)`
only *persists* the RTL flag for native layout mirroring — Android
applies it when a `ReactRootView` is created, not mid-session, so the
very first `ReactRootView` of a fresh install or app update (created
before this JS ever runs) still renders LTR-mirrored.

v2.7.1's fix — calling `react-native-restart`'s `restart()` right after
flipping the flag — turned out not to fix this at all. Reading that
package's own Android source
(`node_modules/react-native-restart/android/.../RestartModule.java`)
shows `Restart()` calls `ReactInstanceManager.recreateReactContextInBackground()`,
which reloads the JS bundle *inside the same Activity/ReactRootView* —
it never creates a new root view, so the layout direction is never
re-read. (The module even imports `ProcessPhoenix`, which *would* do a
real process restart, but never actually calls it — dead code left
over from an earlier version of the library.) This is why RTL kept
being reported broken even after that "fix" shipped and built
successfully.

v2.8.0's fix is a ~15-line custom native module,
`AzarRestart.recreateActivity()`
(`android/app/src/main/java/com/azarapp/AzarRestartModule.kt`), that
calls the real `Activity.recreate()` — which *does* create a fresh
`ReactRootView` and picks up the now-persisted RTL flag. `index.js`
calls it immediately after flipping the flag for the first time, so
the correction happens automatically within the same install/update,
no manual force-close required. `react-native-restart` has been
removed as a dependency — it added native-dependency risk for a fix
that never worked.

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
- **A short standalone `Text` inside a `flexDirection: 'column'`
  container MUST also set `alignSelf: theme.isRTL ? 'flex-end' :
  'flex-start'` — `textAlign: 'right'` alone is not sufficient.**
  This is a real, shipped bug class (v2.3.0): every field label in the
  create/edit forms (`آدرس`, `قیمت`, `توضیحات`, …) rendered flush against
  the screen's *left* edge despite `textAlign: 'right'` being set,
  because a short `Text` node in a column flex container does not
  reliably stretch to the container's full width the way a `View`
  does — with no explicit width, its own bounding box shrinks to its
  content size, and `textAlign` only aligns text *within that box*, so
  a shrunk box sitting at the column's un-mirrored cross-axis start
  (always the left edge, regardless of RTL, since RTL mirroring is a
  *row*-direction concept) reads as fully left-aligned no matter what
  `textAlign` says. `alignSelf` sidesteps this entirely by explicitly
  placing the (still content-sized) box at the correct edge, instead of
  depending on the box stretching first. Applies to every field label,
  card `DetailRow` label, section caption, and any other short text
  that is not itself full-width — full-width/wrapping body text (which
  already spans the container) is unaffected and does not need this.
  **This is not a forms-only rule.** v2.3.0 fixed it in the files that
  happened to be visible in one screenshot; that partial fix is exactly
  why the bug was still reported after v2.3.0 shipped — dozens of other
  standalone `Text` nodes across list screens, empty/error states,
  dialogs, and shared components had the identical bug and were simply
  never looked at. As of v2.4.0 the rule is enforced app-wide: **every
  `<Text>` that is a standalone block-level line inside a column
  container must carry this `alignSelf`, full stop, checked file by
  file, not screen by screen.** The one exception is a `Text` that sits
  inline in a `row` beside an icon or another `Text` (badges, chips,
  icon+label pairs) — there, `alignSelf` controls the *vertical*
  cross-axis position instead, so adding it would break vertical
  centering instead of fixing anything; those are positioned correctly
  by row order alone (see the icon-placement rule above) and need no
  RTL-specific treatment. When adding any new `Text` node to this
  codebase, default to asking "is this a standalone line in a column,
  or is it riding inside a row with something else?" — the former needs
  `alignSelf`, the latter must not have it.

**v2.8.3 — a second, distinct bug class in the same family: `flex: 1`
directly on a `<Text>` inside a `row`.** A real device screenshot after
v2.8.1 (icons finally correct, native RTL mirroring finally active per
v2.8.0) showed several rows — the Dashboard header (avatar + greeting +
chevron) and its "quick actions"/"needs attention" rows (icon badge +
label + chevron) — with the label's text hugging the *wrong* edge,
leaving a large empty gap between it and the icon it's supposed to sit
next to. Every affected `Text` had `flex: 1` set *directly on the Text
itself* (not on a wrapping `View`), stretching its box across the row's
entire remaining width; `theme.typography()` supplies `textAlign` on
that same `Text`, but a `Text` stretched this way did not reliably
right-align its content within that stretched box on-device, the same
class of unreliable-flex-box behavior §10 already documents for
`alignSelf` in a column. The fix is structural, not another alignment
property: group the icon and its label together in their own small
`row` (`flexShrink`, never `flex: 1`, so it sizes to its content and
stays adjacent to the icon), and let `justifyContent: 'space-between'`
on the *outer* row push a trailing chevron/indicator to the opposite
edge — see `QuickActions.tsx`'s `leading` style. **Rule:** a `<Text>`
that needs to fill available space in a `row` must never carry `flex: 1`
itself; wrap it (and anything it must stay adjacent to) in a `flexShrink`
group instead.

**v2.8.4 — the `alignSelf` value itself was backwards, app-wide.** A
real device screenshot of `PropertyDetailScreen` (a screen untouched
since v2.3.0) showed every `DetailRow` label/value flush against the
*left* edge, despite already carrying exactly the
`alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'` pattern this
section has documented since v2.3.0. That pattern was written, and
apparently validated, back when the real native-RTL-activation bug
(fixed only in v2.8.0 — see §10's `index.js`/`AzarRestart` history) meant
`I18nManager.isRTL` was *never actually true* on any device that
"confirmed" it worked: Yoga was laying out every screen in physical/LTR
mode the whole time, so `alignSelf: 'flex-end'` — a value the whole
codebase chose specifically *because* it looked like it meant "physical
right" — worked only by coincidence, because Yoga wasn't RTL-aware yet.
Once v2.8.0 made native RTL genuinely active, Yoga began resolving
`alignSelf`'s `flex-start`/`flex-end` as writing-direction-relative
(`flex-end` = the *logical* end of RTL flow, i.e. physical **left**),
silently inverting every one of these ternaries at once. v2.8.4 flips
all ~43 of them to `theme.isRTL ? 'flex-start' : 'flex-end'` (`flex-start`
now correctly resolves to physical right in RTL). This is the
mirror-image of the v2.8.0 lesson: fixing one long-standing bug for real
can retroactively invalidate other code that only ever "worked" because
the first bug was masking it. **Flag for the next real-device
screenshot check**: confirm this inversion actually landed right instead
of just moving the wrong-side problem — this fix could not be verified
against a live Yoga layout pass (Jest's RN renderer doesn't compute real
layout), only reasoned through from symptoms and RN's documented RTL
mirroring behavior.

**v2.8.5 — confirmed on-device, and closed out the audit.** A real
device screenshot after v2.8.4 shipped confirmed the `alignSelf`
inversion fix actually landed right ("این باگ هایی که در آخر گرفتی کار
رو درست کرد"). Per explicit direction to sweep every remaining screen,
an app-wide script search for `flex: 1` set directly on a `<Text>`
(the other bug class, §10's v2.8.3 note) found two more instances that
earlier passes missed — `ApplicantDetailScreen.tsx` and
`PropertyDetailScreen.tsx`'s `titleRow` title, sitting beside a
`StatusBadge`. Both fixed to `flexShrink: 1` alone, matching the
pattern already established in `ContractDetailScreen.tsx`. A repeat of
the same script against the whole tree now returns zero matches.

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

Standard section order and role — the Dashboard is AZAR's **command
center**, not a KPI dashboard: its job is to answer "what does my
business look like, and what should I do right now", in that order:

1. **Header / identity** — who is using the app right now (avatar +
   greeting), and the one navigation affordance to account/settings.
   Not a card; sits directly on the screen background.
2. **Today / Overview** — the small number of headline counts that
   answer "what does my business look like right now" (active
   properties, active applicants, new matches, today's follow-ups).
   §7.3.1's fixed 2-column grid, kept visually quiet — these are
   context, not the point of the screen. No section heading text
   needed — the header above already establishes context.
3. **Needs Attention** — v2.5.0's addition, and the section that makes
   this a command center instead of a KPI board: a short, concrete list
   of things that need the broker's action today (e.g. "۳ متقاضی
   نیازمند پیگیری", "۲ ملک دارای متقاضی مناسب", "۱ قرارداد در انتظار
   اقدام"), each row tappable straight to the relevant filtered list or
   record. Ranked **above** Primary Actions — a broker with something
   urgent needs to see it before being invited to create something new.
   Uses `attention`-tone `StatusBadge`-style accents (§6.5), never a
   full KPI-card treatment — these are compact rows, not tiles. Empty
   state for this section is simply not rendering it (an empty "Needs
   Attention" heading with nothing under it is noise, not information).
4. **Primary Actions** — exactly two: افزودن پرونده ملکی and افزودن
   متقاضی. These get the only elevated/prominent visual treatment on
   the Dashboard; every other action reachable from this screen
   (`مشاهده پیگیری‌ها` etc.) is visually secondary — smaller, lower
   contrast, no container elevation — so the eye lands on Create first.
   Only one of the two primary actions may carry the single "loudest"
   accent treatment at a time if a further distinction is ever needed;
   by default both are equal-weight primaries. Gets a `titleMd` section
   heading (§2).
5. **Recent Activity** — general historical context (activity log)
   that's useful but never time-critical; sits after Reminders because
   it's the section most safe to require a scroll to reach.
6. **Reminders** — upcoming (not yet due) reminders, distinct from
   Needs Attention's *overdue* ones; uses the `compact` EmptyState
   (§7.7) when there's nothing upcoming.
7. **Persistent navigation** — the bottom tab bar (§7.5), always
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

## 16. Navigation Architecture

Each screen belongs to **exactly one** bottom tab's stack — never
duplicated into every tab. Ownership by tab:

| Tab | Owns |
|---|---|
| Home | Dashboard, and everything reached only from the dashboard with no more specific owner (reminders) |
| Files | Property list/create/detail, Applicant list/create/detail |
| Matching | Matching entry screen, Deal list/detail |
| Contracts | Contract list/create/detail |
| Profile | Settings |

**Why this matters (v2.3.0 — real regression this corrects):** an
earlier structure mounted the *same* full screen stack identically
inside all five tabs, so that any `navigation.navigate('X')` call
"just worked" regardless of which tab it was called from. That
convenience came at a real UX cost: tapping a Dashboard shortcut into
Property detail pushed Property detail onto the *Home* tab's own
stack — the tab bar still highlighted Home while the user was
looking at a Files-owned screen, and the hardware/gesture back button
retraced the full cross-tab journey step by step instead of behaving
like a normal tab app.

**The fix, and the rule going forward:** register each screen in
exactly one tab's stack navigator. `navigation.navigate('ScreenName',
params)` called from anywhere in the app still works unchanged —
React Navigation's nested-navigator bubbling finds the screen in its
owning tab's stack and switches to that tab automatically — but now
the tab bar correctly reflects which section the user is actually in,
and the back button pops within that tab's own stack, never replaying
a path through a different tab. Do not reach for a screen-name lookup
table or manual tab-switch call to get this behavior — it is what
nested tab+stack navigators already do by default once each screen is
registered exactly once.

## 17. Phase 2 — CRM Workflow (v2.6.0)

v2.5.0 redesigned Part 1 (Dashboard, Property, Applicant). v2.6.0 does
the same for Part 2 — Matching, Deal, Reminder, Contract — around one
explicit entity relationship the UI must make legible, not just
functional:

```
PROPERTY ──MATCHING── APPLICANT
      \                    /
       \                  /
            → DEAL ←
           /        \
    REMINDER       ACTIVITY
        │
        ↓
    CONTRACT
```

**Matching** finds the opportunity → **Deal** manages the process →
**Reminder** is the next concrete step → **Activity** is the history →
**Contract** is the formal outcome once a Deal is won. A screen in this
part of the app that doesn't visibly serve one of these five roles is
the wrong screen.

### 17.1 Matching Workspace (not a picker)

Matching's entry point lets the user choose ملک or متقاضی, then shows
results for the selected record using the shared `MatchingResult`
component (`src/shared/components/MatchingResult.tsx`) — see that
file's doc comment for the exact, deliberately-honest scoring rule:
the matching engine's `score` (`matchingService.ts`) is real but not
normalized against a shifting maximum, so the UI never shows it as a
bare percentage. It shows **"X از Y معیار منطبق"** (an unambiguous
count) plus a qualitative tone (`matchTone`: تطابق بالا / مناسب /
محدود) derived from the matched *fraction*. Every result gets one
clear primary action (`ایجاد معامله` most commonly) — never more than
one loud CTA per result card, per §0.2's UI-overload ban.

Property/Applicant Detail keep a **compact** matching section (already
built in v2.5.0 via `SuggestedPropertiesSection`/
`SuggestedApplicantsSection`) — that section is not the Workspace and
should stay compact; "مشاهده همه" is how a user reaches the full
Workspace for that record.

### 17.2 Deal Pipeline

`DealStage`'s real 9 stages (`DealRepository.ts`) collapse into 4
visual groups + 2 terminal outcomes for a compact, non-stepper mobile
indicator — see `PipelineIndicator.tsx`'s doc comment for the exact
grouping. The underlying `currentStage` value is never altered by this
grouping; it's a display concern only.

Deal Detail structure, top to bottom: **Header** (property × applicant
identity + `StatusBadge`) → **Next Action** (`NextAction.tsx` — only
rendered when a real upcoming/overdue reminder exists for this deal;
never fabricated) → **Pipeline** (`PipelineIndicator`) → **Property +
Applicant summary** (compact, not two full detail cards restated) →
**Activity** (`ActivityTimeline`) → **Notes** → **Actions**
(hierarchical per §7.1: `ایجاد قرارداد` primary, `افزودن پیگیری`
secondary, no destructive action stacked at equal visual weight).

### 17.3 Reminder

Reminder List is **time-grouped** (امروز / فردا / بعداً — a plain date
comparison against `remindAt`, not a new scheduling concept) with a
compact **Needs Attention**-style header row for overdue + due-today
counts (reuses the `attention` `StatusBadge` tone, not a new pattern).
A Reminder tied to a property/applicant/deal shows that context via
`ContextHeader.tsx` — never a bare title-only row when real linkage
data exists on the record (`propertyId`/`applicantId`/`dealId`, all
already on `ReminderRecord`).

### 17.4 Contract

Contract is explicitly **the formal outcome**, distinct from Deal (the
process). Contract Detail avoids a card stack (§0.2's ban) in favor of
sectioned content with dividers — see the brief's own worked example.
Contract status changes go through a `SegmentedControl`/bottom-sheet
selection with a short success confirmation, not a silent state flip.
Existing `ContractStatus` values are kept as-is; this is presentation,
not a schema change.

### 17.5 Money input for large amounts

For fields expecting large amounts (contract value), the existing
`MoneyInput` quick-scale chips (میلیون/میلیارد, v2.4.0) already solve
"don't make the user type many zeros" — Phase 2 doesn't need a second,
different large-amount input pattern; reuse `MoneyInput` as-is rather
than inventing a scale-unit dropdown that would fragment the pattern
already established for Property/Applicant.

### 17.6 Reusable components introduced in v2.6.0

`ActivityTimeline` (relocated from a Dashboard-only component to
`src/shared/components/`, used by Dashboard/Property/Applicant already
and now Deal/Contract too — one pattern, never re-implemented per
entity), `MatchingResult`, `PipelineIndicator`, `ContextHeader`,
`NextAction`. All follow the existing `createStyles(theme)` /
`StatusBadge`-for-state / RTL-`alignSelf` conventions established in
Part 1 — no new architectural pattern was introduced solely for Part 2.

### 17.7 No fabricated data (restated, applies everywhere in Part 2)

Match scores, activity, deal status, and contract data must reflect
real records or the section renders its `EmptyState`/is omitted
entirely (§14's "Needs Attention" precedent) — never a placeholder
number or synthetic history row invented to make a screen look fuller.

### 17.8 Selection List Row (v2.7.0)

A dedicated, lighter row for "pick one record to act on next" contexts
— the Matching Workspace's property/applicant picker step being the
first (and, as of v2.7.0, only) user — via `SelectionListItem.tsx`. It
is deliberately distinct from `PropertyListItem`/`ApplicantListItem`
(which carry status badges, price, and a meta grid, right for their
own list screens but heavier than a quick picker step needs): a
circular colored icon badge, a bold single-line title, a quiet
one-line subtitle, and a trailing chevron (or a check when the row is
the current selection).

The icon badge's color is intentionally one of AZAR's two existing
brand accents (`secondary`/bronze or `tertiary`/emerald container
roles), not an arbitrary new hue — this pattern was prompted by a
reference screenshot using a generic blue, but per §0.2/§1's "one
accent, deliberately" rule the badge is re-skinned in AZAR's own
palette rather than importing a foreign brand color. Exactly one tone
is used per screen/list (e.g. bronze for the property picker, emerald
for the applicant picker) — never mixed within a single list.

Use `SelectionListItem` specifically for **transient pick-one-of-many
steps**, not as a replacement for a feature's own list screen. If a
future screen needs the same "which one do I want" pattern (e.g. a
property/applicant field on a form that opens a picker instead of
free text), reuse this component rather than building another bespoke
row.
