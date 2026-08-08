# AZAR Design System

Status: DRAFT — authoritative UI specification. Every UI implementation from
Phase 4 onward must follow this document unless a documented exception is
recorded in `/docs/ui/design-system-audit.md`. This document does not modify
application code, does not begin Phase 4, and does not redesign the product —
it formalizes and reconciles what the Stitch design set
(`/design/stitch/stitch_elite_real_estate_crm/`) already established, using
Material Design 3 (https://m3.material.io/) as the structural foundation.
Date: 2026-08-08

## 0. Positioning statement

This is **not** a Material 3 reference implementation and **not** a generic
Google Material clone. It is:

> **Material 3 structural foundation** (type scale shape, elevation model,
> component anatomy, adaptive layout, state layers)
> **+ AZAR product identity** ("Executive Precision": Deep Charcoal-on-
> Off-White, Geist/Inter dual-font, soft-flat minimal elevation)
> **+ Persian/RTL-first mobile UX** (Vazirmatn as a first-class typeface, not
> a fallback)
> **+ Offline-first interaction patterns** (local operations never show
> network-style loading; connectivity states are scoped, not global)

Where Material 3 recommends something that conflicts with the existing AZAR
identity already validated across 32 Stitch screens (e.g. Material 3's
default heavier tonal-elevation shadows, or its wider "expressive" motion
palette), this document deliberately narrows Material 3 rather than adopting
it wholesale — consistent with the product's "minimal, premium, calm,
professional" brand pillars (`executive_precision/DESIGN.md`).

## 1. Audit summary (source of truth for every value below)

Every token in this document is grounded in what the Stitch design package
(post-correction-pass, 32 screens) actually uses, reconciled where the
package's own `DESIGN.md` prose and its 15+ per-screen embedded Tailwind
configs disagreed with each other. See
`/docs/ui/design-system-audit.md` for the full screen-by-screen accounting.
Headline findings that shaped this document:

- **Color**: `executive_precision/DESIGN.md`'s prose names "Emerald
  (#2D5A27)" and "Muted Blue (#335C67)" as brand accents, but the actual
  implemented `secondary` token is `#3b6934` and there is no `#335C67`
  token anywhere — the implemented tokens are adopted as ground truth here;
  the prose in `DESIGN.md` is flagged as inaccurate documentation, not a
  design defect (§12, §J item in the audit).
- **Radius**: already reconciled in the prior correction pass — `DESIGN.md`
  and every screen's embedded config now agree. This document keeps that
  resolution as final (§10).
- **Icon sizing**: used ad hoc across screens (10px, 14px, 16px, 18px, 20px,
  24px, 28px, 32px, 48px with no naming) — consolidated into a six-step
  scale here (§13).
- **A missing type step**: bottom-navigation labels use a bespoke 10px size
  (`text-[10px]`) that was never a named token in `DESIGN.md`'s type scale —
  formalized here as `label-sm-mobile` (§3).
- **Spacing**: no custom spacing scale was actually in use beyond Tailwind's
  own default 4px-increment scale (`p-1`…`p-8` etc.) plus four named
  semantic tokens (`base`, `gutter`, `margin-mobile`, `margin-desktop`) —
  formalized into a complete `space-*` scale here (§5) that keeps every
  value already in use and fills the gaps Material-style token thinking
  expects.
- **Persian typography**: one screen — `dashboard_home_persian_rtl` — still
  uses the Latin fonts Geist/Inter for Persian text, relying on browser
  fallback rather than a chosen Persian typeface. Every other RTL screen in
  the set (`smart_matching_match_analysis_persian_rtl` and all five RTL
  screens added in the Phase 3 correction pass) already uses **Vazirmatn**.
  This document adopts Vazirmatn as the **final, formal** Persian typeface
  (§3.2) and flags `dashboard_home_persian_rtl` alone as a **Category B
  deviation** to normalize (see the audit).

## 2. How to read this document

Tags used throughout: **[TOKEN]** marks an authoritative, implementation-
ready value. **[RATIONALE]** explains a non-obvious choice. **[EXCEPTION]**
marks a documented, intentional deviation for a specific context.

---

## 3. Typography System

Material 3's five-tier hierarchy (Display / Headline / Title / Body / Label)
is adopted as the structural model. AZAR's existing type scale already maps
cleanly onto four of the five tiers; **Title** did not exist as a distinct
step in the Stitch set (headings jumped from Headline directly to Label-
weight metadata) — added here as a genuine gap-fill, not a redesign, because
Material 3's component specs (list item titles, dialog titles, card titles)
assume it exists.

### 3.1 LTR scale (Geist for Display/Headline/Title/Label, Inter for Body)

| Token | Font | Size | Weight | Line height | Letter spacing | Usage | Max context |
|---|---|---|---|---|---|---|---|
| `display` | Geist | 40px | 600 | 48px | -0.02em | App-level hero moments only (none currently used in-product; reserved) | One per screen, if ever used |
| `headline-lg` | Geist | 32px | 600 | 40px | -0.02em | Desktop page titles (e.g. "Backup & Security") | One per screen |
| `headline-lg-mobile` | Geist | 24px | 600 | 32px | -0.01em | Mobile page titles | One per screen |
| `headline-md` | Geist | 24px | 500 | 32px | -0.01em | Section headers within a page (e.g. "Configure Reminders") | 1-2 per screen |
| **`title-md`** [NEW — gap-fill] | Geist | 18px | 600 | 24px | -0.005em | Card/list-item titles, dialog titles (e.g. a property address as a card heading, "Confirm Restore" dialog title) | Per card/dialog |
| **`title-sm`** [NEW — gap-fill] | Geist | 16px | 600 | 22px | 0em | Compact card titles, section sub-headers | Per compact card |
| `body-lg` | Inter | 18px | 400 | 28px | normal | Rare — long-form reading contexts only (none currently used) | Reserved |
| `body-md` | Inter | 16px | 400 | 24px | normal | Default body copy: descriptions, notes, form values, match explanations | Primary body text everywhere |
| **`body-sm`** [NEW — gap-fill] | Inter | 14px | 400 | 20px | normal | Secondary/supporting body text (card subtitles, helper text) — was previously done ad hoc via `text-sm` on a `body-md`-styled element in several screens | Card metadata, helper text |
| `label-md` | Geist | 14px | 500 | 20px | 0.01em | Field labels, button labels, list metadata labels | Buttons, form labels |
| `label-sm` | Geist | 12px | 600 | 16px | 0.02em | Chips, badges, status tags, timestamps | Chips/badges only |
| **`label-sm-mobile`** [NEW — formalized existing ad hoc value] | Geist | 10px | 600 | 14px | 0.02em | Bottom-navigation item labels **only** | Bottom nav, nowhere else |

**[RATIONALE]** `title-md`/`title-sm`/`body-sm` are the only genuinely new
tokens in this document. They were already being approximated ad hoc in the
Stitch screens (e.g. `font-headline-md text-body-lg` combinations, or
`text-sm` applied to a `body-md`-based element) rather than invented from
nothing — see the audit for exact instances. `label-sm-mobile` formalizes
the 10px bottom-nav label size that appeared 36 times across screens with no
named token at all.

### 3.2 RTL / Persian scale

**Typeface decision: Vazirmatn**, replacing Geist/Inter's Latin-only glyphs
(which have no Persian coverage and silently fall back to a system font) for
all Persian-language screens. Vazirmatn is already in place in six of the
seven RTL screens: the five screens added in the Phase 3 correction pass
(`file_management_applicant_detail_persian_rtl`,
`file_management_owner_edit_persian_rtl`, `ui_destructive_confirmation_persian_rtl`,
`restore_existing_data_warning_persian_rtl`, `settings_contract_reminders_persian_rtl`)
plus `smart_matching_match_analysis_persian_rtl` (which already used
Vazirmatn independent of that pass — only its content was edited during
correction, not its typeface). This document makes Vazirmatn the **final,
formal** choice and flags the one remaining screen still on Latin-font
fallback — `dashboard_home_persian_rtl` — as a Category B deviation to
normalize (see the audit).

**Evaluation against the request's specific criteria:**
- **Glyph height / readability**: Vazirmatn is a purpose-built,
  contemporary Persian/Arabic-script UI typeface (used widely in Persian
  product UIs) with x-height and stroke weight calibrated for screen
  reading at small sizes — verified visually in this session's rendered
  screenshots at 14-24px sizes with no legibility issues.
- **Line height**: Persian script's diacritics, descenders, and joined
  letterforms need **more vertical room than the equivalent Latin line-
  height token** — see §4 for the explicit +15% RTL line-height rule.
- **Numeral rendering**: Vazirmatn ships a Farsi-digit variant
  (`UI-Farsi-Digits`), but this document does **not** mandate automatic
  digit-shaping. Numerals must be chosen explicitly per context (§3.3),
  since automatic shaping caused real inconsistency in the pre-correction
  RTL screens (Persian digits in some labels, Western digits in match-score
  badges and prices, in the same screen).
- **Mixed Persian/English and Persian/numbers**: verified working correctly
  in the corrected RTL screens via explicit `dir="ltr"` spans wrapped around
  Latin/numeric fragments embedded in Persian sentences (e.g. phone numbers,
  emails, USD prices) — this pattern is now the mandated rule (§3.3), not
  left to chance.
- **Punctuation**: Persian uses its own comma (`،`) and question mark
  (`؟`) in fully-Persian sentences; ASCII punctuation is acceptable inside
  `dir="ltr"` embedded fragments (e.g. `(206) 555-0148`). Not yet
  consistently applied in the Stitch set — flagged as a Category B item.
- **RTL alignment**: verified correct in all 7 RTL screens — text right-
  aligned, icons/nav mirrored appropriately (§13.5 documents exactly which
  icons mirror and which must not).

| Token | Font | Size | Weight | Line height | Letter spacing | Usage |
|---|---|---|---|---|---|---|
| `display-rtl` | Vazirmatn | 40px | 600 | **56px** | 0 | Reserved, matches `display` |
| `headline-lg-rtl` | Vazirmatn | 32px | 600 | **46px** | 0 | Desktop page titles |
| `headline-lg-mobile-rtl` | Vazirmatn | 24px | 600 | **37px** | 0 | Mobile page titles |
| `headline-md-rtl` | Vazirmatn | 24px | 500 | **37px** | 0 | Section headers |
| `title-md-rtl` | Vazirmatn | 18px | 600 | **28px** | 0 | Card/dialog titles |
| `title-sm-rtl` | Vazirmatn | 16px | 600 | **25px** | 0 | Compact card titles |
| `body-md-rtl` | Vazirmatn | 16px | 400 | **28px** | 0 | Default body copy |
| `body-sm-rtl` | Vazirmatn | 14px | 400 | **23px** | 0 | Secondary body text |
| `label-md-rtl` | Vazirmatn | 14px | 500 | **23px** | 0 | Field/button labels |
| `label-sm-rtl` | Vazirmatn | 12px | 600 | **18px** | 0 | Chips, badges |
| `label-sm-mobile-rtl` | Vazirmatn | 10px | 600 | **16px** | 0 | Bottom nav labels |

**[RATIONALE — no letter-spacing in RTL]** Material 3 and the LTR scale use
negative/positive tracking to create typographic "premium" tightness in
Latin type; Persian script does not benefit from letter-spacing adjustments
(joined letterforms can visually break), so all RTL tokens use `0`.

### 3.3 Mixed-direction content rule [BUSINESS RULE for implementation]

Any Latin text, numeral, currency figure, phone number, or email address
embedded inside a Persian sentence **must** be wrapped in an explicit
`dir="ltr"` inline span (already the working pattern in the corrected RTL
screens, e.g. `<span dir="ltr">$1.25M</span>`, `<span dir="ltr">(206)
555-0148</span>`). Do not rely on Unicode bidi auto-detection alone — the
pre-correction RTL screens showed inconsistent results without it (an
untranslated English paragraph sitting inside an otherwise-Persian panel).

Numeral system per context (formalized from the audit's inconsistency
finding):
- **Generic counts, day/date labels written in Persian prose** (e.g. "۳
  فوری", "۹۰ روز مانده"): Persian (Eastern Arabic-Indic) numerals.
- **Currency figures, technical identifiers (file sizes, version numbers,
  contract reference codes), match-score percentages**: Western numerals
  inside a `dir="ltr"` span, regardless of surrounding language — because
  these are cross-referenced against structured data (prices, percentages)
  where numeral-system switching would harm scannability and consistency
  with any LTR/English views of the same data.

---

## 4. Line-Height Standard

No arbitrary line-height value may be set per-screen; every text element
uses the line-height baked into its typography token (§3). This section adds
the rules for contexts Material 3 doesn't specify a value for directly:

| Context | Rule |
|---|---|
| Single-line labels (chips, badges, nav labels) | Line-height equals the token's defined value; text must never wrap — truncate with ellipsis instead (§17). |
| Buttons | `label-md` line-height (20px / 23px RTL); button height is controlled by padding (§8.1), not line-height. |
| Form labels | `label-md`. |
| Body text (default) | `body-md`. |
| Multi-line descriptions (notes, private notes, applicant preferences) | `body-md`/`body-sm` as sized: never reduce line-height below the token default to "fit more text" — use a "show more" affordance instead if truncation is needed. |
| Error messages / helper text | `body-sm`, with `label-sm`-level color emphasis (§12) but body-tier line-height — error text needs reading room, not label-tier tightness. |
| Cards | Title uses `title-md`/`title-sm`; body/metadata uses `body-sm`. |
| Dialogs (including destructive confirmations) | Title `title-md`; body `body-md` — confirmation consequence text must never be visually cramped, given how safety-critical it is (Phase 1 §4). |
| Match explanations | `body-md` for the explanation paragraph; `label-md` for criterion names; `body-sm` for criterion detail lines. |
| Notes (private/internal notes) | `body-md`, `body-sm` for the "last updated" metadata line. |

**RTL line-height uplift rule**: every RTL token in §3.2 carries roughly
**+15-17% line height over its LTR counterpart** at the same font size (e.g.
`body-md` 24px → `body-md-rtl` 28px). This is not optional per-screen
tuning — it is a fixed formula, because Persian's diacritics and descenders
need consistently more vertical room than Latin text at the same point
size, and ad hoc per-screen adjustment is exactly what produces visual
crowding.

---

## 5. Spacing System

**[RATIONALE]** The Stitch set never actually used arbitrary values like
13px/17px/19px — it already consistently used Tailwind's default 4px-
increment scale (`p-1`=4px through `p-8`=32px) plus four named semantic
tokens (`base`=8px, `gutter`=16px, `margin-mobile`=16px,
`margin-desktop`=32px). This section formalizes that existing discipline
into the complete named scale the brief asks for, rather than introducing a
new numeric system.

| Token | Value | Maps to existing usage |
|---|---|---|
| `space-0` | 0px | Removing default spacing |
| `space-1` | 4px | Icon-to-text micro gaps, chip internal padding |
| `space-2` | 8px | = `base`. Tight internal gaps (icon/text gap default) |
| `space-3` | 12px | List-item internal padding, form field internal padding |
| `space-4` | 16px | = `gutter` = `margin-mobile`. Card padding, section gaps, page edge margin (mobile) |
| `space-5` | 20px | Rare: generous internal card padding |
| `space-6` | 24px | Dialog/bottom-sheet padding, relaxed section spacing (`relaxed-gutter`, already used in owner/applicant detail screens) |
| `space-8` | 32px | = `margin-desktop`. Desktop page edge margin, major section separation |
| `space-10` | 40px | Large touch-target-adjacent spacing (rare) |
| `space-12` | 48px | Empty-state vertical spacing, generous top-of-screen breathing room |
| `space-16` | 64px | Reserved for large empty/onboarding states |

### 5.1 Applied spacing rules

| Context | Token |
|---|---|
| Page horizontal padding (mobile) | `space-4` (16px) |
| Page horizontal padding (desktop) | `space-8` (32px) |
| Section-to-section vertical spacing | `space-6` (24px), or `space-4` for data-dense list screens (matches DESIGN.md's "compact" vs. "relaxed" gutter distinction — compact=`space-3`, relaxed=`space-6`) |
| Card padding | `space-6` (24px) for detail/profile cards; `space-4` (16px) for list-item cards |
| Form field vertical spacing (label→input) | `space-2` (8px) |
| Form field group spacing (field→next field) | `space-6` (24px) |
| List row internal spacing | `space-4` (16px) horizontal, `space-3` (12px) vertical |
| Dialog/confirmation padding | `space-6` (24px) |
| Bottom-sheet header/body/footer padding | `space-6` (24px) horizontal and vertical, matching the existing `restore_*` and edit-form sheets |
| Navigation item internal padding | `space-3`–`space-4` (12-16px) |
| Icon-to-text gap | `space-2` (8px) default; `space-1` (4px) for compact chips |
| Label-to-input gap | `space-2` (8px) |
| Title-to-subtitle gap | `space-1` (4px) |

No value outside this scale is permitted without an explicit, documented
`[EXCEPTION]` entry in the audit.

---

## 6. Grid System

Material 3's adaptive-layout breakpoints are adopted directly, since the
Stitch set's own `md:` breakpoint already aligns closely with Material 3's
"medium" boundary:

| Class | Width range | Columns | Margin | Gutter |
|---|---|---|---|---|
| **Compact** (phone, default) | 0–599px | 4 | 16px (`space-4`) | 16px (`space-4`) |
| **Medium** (large phone landscape / small tablet) | 600–839px | 8 | 24px (`space-6`) | 16px (`space-4`) |
| **Expanded** (tablet / desktop) | 840px+ | 12 | 32px (`space-8`) | 24px (`space-6`) |

- **Content width**: capped at `container-max-width` (1200px, already
  defined) on Expanded; full-bleed with margin on Compact/Medium.
- **Card width**: full column width on Compact; in a bento/grid layout on
  Expanded (already the pattern in `file_management_owner_detail`'s
  `md:col-span-8`/`md:col-span-4` split — kept as-is, this is correctly
  Material-3-adaptive already).
- **List width**: full column width at all breakpoints — lists do not
  multi-column even at Expanded (data-dense CRM lists read better as a
  single scannable column; matches existing `file_management_all_files`
  behavior).
- **Form width**: full width on Compact; capped at ~480px centered on
  Medium/Expanded when presented as a bottom sheet (already the pattern —
  `md:w-[480px] md:left-1/2 md:-translate-x-1/2`).
- **Bottom-sheet width**: full width on Compact (edge-to-edge, rises from
  the bottom); capped at 480px, centered, on Medium/Expanded (already
  implemented consistently across every bottom-sheet screen).
- **Modal/dialog width**: same rule as bottom sheets — Material 3 treats a
  centered dialog on larger screens as the adaptive equivalent of a
  full-width bottom sheet on Compact, which is exactly what the existing
  `md:bottom-auto md:top-1/2 md:-translate-y-1/2` pattern already does.

**Future-tablet note**: because Compact/Medium/Expanded are already
structurally present in the Stitch set's `md:` breakpoint usage (even though
only two effective breakpoints — Compact and "everything else" — are
exercised today), supporting a true Medium (tablet-portrait) breakpoint
later is a matter of adding intermediate `sm:`/`md:` rules to existing
components, not a redesign.

---

## 7. Layout Tokens

| Token | Value | Notes |
|---|---|---|
| Page horizontal padding | `space-4` (mobile) / `space-8` (desktop) | §5.1 |
| Top app-bar height | 64px (`h-16`, already used everywhere) | Fixed, `position: fixed` |
| Bottom navigation region height | 80px (`h-20`, already used) plus safe-area inset | `pb-safe` already applied in every screen with a bottom nav |
| Section spacing | `space-6` (relaxed) / `space-3` (compact) | §5.1 |
| Content max-width | 1200px (`container-max-width`) | Expanded breakpoint only |
| Safe-area handling | `pb-safe` utility already used for bottom nav; **top safe-area** (notch) is not yet explicitly handled anywhere in the Stitch set — **[gap, flagged in the audit as Category D for the fixed top app-bar]**, since a `position: fixed` header at `top: 0` with no safe-area inset would sit under a notch/status bar on a real device. |
| Keyboard-aware layout | Not yet exercised in any static Stitch screen (forms are bottom sheets, which on real mobile OSes are typically pushed up above the keyboard automatically) — **[OPEN-ARCH, implementation-phase]**: the actual mobile framework's keyboard-avoidance behavior (ADR-001, Phase 3) governs this; this document only requires that no input field may ever be obscured by the keyboard, whichever mechanism achieves that. |
| Bottom-sheet margins | 0 (edge-to-edge) on Compact; centered with `md:` auto margins on Medium/Expanded | Already implemented |
| Modal margins | Same as bottom-sheet margins | Already implemented |

### 7.1 Layout behavior documentation

- **Keyboard opens**: primary action buttons in a bottom sheet must remain
  reachable (either the sheet scrolls internally, per the existing
  `overflow-y-auto flex-1` body pattern, or the whole sheet shifts up) —
  behavioral requirement, not a static-design concern; already structurally
  supported by the existing scrollable-body + fixed-footer sheet anatomy.
- **Content is long**: internal scroll within the sheet/page body, with a
  fixed header and footer (already the pattern in every bottom sheet and in
  `file_management_owner_detail`/`file_management_applicant_detail`).
- **Screen is small**: Compact grid (§6) applies; no component may require
  more than 320px width to remain usable (the narrowest screens in the
  current set render at 343-419px and remain legible).
- **Screen is large**: Expanded grid applies; content width caps at
  `container-max-width` rather than stretching full-bleed.
- **Device has a notch**: top app-bar must respect `env(safe-area-inset-
  top)` — flagged as a gap to close in implementation (§7 above), since no
  Stitch screen currently demonstrates this.
- **Safe-area changes** (rotation, foldables): not exercised in the current
  static screen set at all; deferred to Phase 3/4 implementation, not a
  design-system gap specifically.

---

## 8. Component Standardization

For every component: size, padding, typography, radius, icon size, spacing,
states, accessibility, usage rules. Grounded in what's already built across
the 32 screens; only genuinely absent components (Date Pickers, Snackbars,
Tabs — none appear anywhere in the current Stitch set) get a Material-3-
sourced specification marked **[NEW]**, since there's no existing product
usage to reconcile against.

### 8.1 Buttons
- **Sizes**: Primary action `py-3` to `py-4` (12-16px) vertical padding ×
  `px-6` (24px) horizontal, full-width in forms/sheets or auto-width inline
  — height resolves to ~48-56px, meeting Material 3's 40dp minimum
  comfortably and the touch-target minimum (§9).
- **Typography**: `label-md`.
- **Radius**: `radius-large` (§10) — matches the existing `rounded-lg`
  usage on primary CTAs.
- **States**: `active:scale-[0.98]` press feedback (already used
  consistently) + `hover:opacity-90` — no separate "pressed" color variant
  exists today; add a `disabled:opacity-50 disabled:cursor-not-allowed`
  state (already used on the Owner Edit form's disabled Save button) as the
  **standard** disabled treatment for every button, not just that one
  screen.
- **Variants**: Primary (filled, `bg-primary`), Secondary (outlined, `border
  border-outline`), Destructive (filled `bg-error`), Text/Ghost (no
  container, used for "Cancel," "View Explanation").
- **Usage**: one primary action per screen/sheet footer maximum; destructive
  actions always paired with a Cancel/secondary action (Phase 1 §4).

### 8.2 Icon Buttons
- **Size**: 40px container (`w-10 h-10`, already used for back/close
  buttons) with a `text-[20px]`–`24px` icon centered inside.
- **[TOUCH TARGET FLAG]**: 40px is below Material 3's 48dp recommendation —
  see §9 for the resolution (effective target padding, not visual
  enlargement).
- **Radius**: `radius-full` (circular).
- **States**: `hover:bg-surface-container-low`, `active:opacity-80`.

### 8.3 Text Fields
- **Structure**: label above field (already the pattern), field with
  `border border-outline-variant/50`, `rounded-lg` (radius-large),
  `py-3 px-4` internal padding.
- **Typography**: label `label-md`; input value `body-md`.
- **States**: default, focus (`focus:border-primary focus:ring-1
  focus:ring-primary` — already used), error (`border-2 border-error`,
  already used in the Owner Edit form and Restore password screens),
  disabled.
- **Helper/error text**: `body-sm`, positioned directly below the field with
  `space-1` gap, error text in `error` color with a leading `error` icon
  (already the pattern).

### 8.4 Search
- **Structure**: leading search icon + input, `rounded-lg`, used both as a
  header icon-button (collapsed) and an inline full-width bar (file list
  screen) — both patterns already exist and are both valid, used
  contextually (header = quick global search entry point; inline = active
  list filtering).

### 8.5 Dropdowns
- **[NEW — not exercised in current screens]** Material 3 filled/outlined
  select pattern: same visual treatment as Text Fields (§8.3) with a
  trailing `expand_more` icon (already used for the country-code selector on
  phone entry — extend that exact pattern to any future dropdown).

### 8.6 Chips
- **Size**: `px-3`–`px-4` horizontal, `py-1`–`py-1.5` vertical, `label-sm`
  typography, `radius-full`.
- **Variants**: filter chips (segmented-control style, §8.7), status chips
  (colored fill, e.g. "Active"/"Pending"/"Closed"), amenity/selection chips
  (outlined default, filled+checkmark when selected — already the exact
  pattern in `file_creation_property_entry`).
- **Priority chips (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE)**: see §18, a
  dedicated specification.

### 8.7 Segmented Controls
- **Structure**: light-grey track (`bg-surface-container-low`), sliding/
  filled active segment (`bg-on-tertiary` or `bg-primary-container`
  depending on context), `rounded-lg` track with `rounded` inner segments.
- **Usage**: preferred over tabs for quick filtering or mutually-exclusive
  choice (property type, priority level) — already DESIGN.md's stated
  preference; kept as-is.

### 8.8 Cards
- **Radius**: `radius-large` (`rounded-lg`, 8px) for list-item cards;
  `radius-extra-large` (`rounded-xl`, 12px) for detail/profile/dialog cards
  — this is the one place the existing set uses two different radii for
  "cards" depending on context, which is intentional and preserved (large
  cards read as more "premium/contained," matching DESIGN.md's stated
  container hierarchy) rather than flattened to one value.
- **Elevation**: `elevation-1` default (§11); `elevation-0` (border only,
  no shadow) for cards inside an already-elevated container (e.g. a card
  inside a bottom sheet).
- **Padding**: `space-6` (detail cards) / `space-4` (list-item cards).

### 8.9 Lists / List Items
See §17, a dedicated specification.

### 8.10 Bottom Sheets
- **Anatomy**: drag handle (`w-10 h-1`, `rounded-full`,
  `bg-outline-variant`, `opacity-50`) → header (title `title-md` + subtitle
  `label-sm` + close icon-button) → scrollable body → fixed footer with
  action button(s). Exactly the existing pattern across every sheet screen
  — kept as-is, formalized as the mandatory anatomy for any new sheet.
- **Radius**: `radius-extra-large` top corners only on Compact
  (`rounded-t-[16px]`); all corners on Medium/Expanded
  (`md:rounded-[16px]`) — note this 16px value is **outside** the §10
  radius scale's named steps; formalized as a dedicated
  `radius-container-lg` token reserved for sheets/dialogs specifically
  (§10).
- **Motion**: `slideUp` 300ms, `cubic-bezier(0.4, 0, 0.2, 1)` (§14).
- **Scrim**: `bg-primary/20 backdrop-blur-sm` (already used consistently).

### 8.11 Dialogs
- Confirmation dialogs use the same bottom-sheet anatomy (§8.10) rather than
  a separate small centered-modal pattern — already the case for every
  destructive confirmation and restore-flow screen. This is a deliberate,
  documented **[EXCEPTION]** to Material 3's usual Dialog-vs-Bottom-Sheet
  distinction: AZAR treats *all* modal interruptions as bottom sheets for
  interaction consistency and one-handed reachability, never a small
  floating centered dialog.

### 8.12 Snackbars
- **[NEW — not present in current screens]** Material 3 snackbar
  specification adopted directly for transient, non-blocking confirmations
  (e.g. "Reminder settings saved"): `surface-container-highest` background,
  `inverse-on-surface`/`inverse-surface` text, single optional text action,
  bottom-anchored above the bottom nav, auto-dismiss ~4s. **Not yet used
  anywhere** — flagged for implementation-phase adoption where a
  non-blocking success confirmation is more appropriate than a full dialog
  (e.g. after a quick toggle change), consistent with Phase 1 §16's
  "optimistic UI where safe" guidance.

### 8.13 Banners
- Inline, non-dismissible informational banners (`bg-surface-container-low`,
  `border border-outline-variant`, leading icon + text) — already the exact
  pattern used for the local-notification banner in
  `settings_contract_reminders` and the "unsaved changes" banner in the edit
  forms. Formalized as the standard pattern for persistent contextual
  information (as distinct from a Snackbar's transient nature).

### 8.14 Tabs
- **[NEW — the file-list screen's "Owners/Properties" / "Applicants"
  control is a segmented control (§8.7), not a Material 3 Tab]** — this
  document does not introduce true Tabs; segmented controls already cover
  every case that has arisen. If a future screen genuinely needs
  scrollable/overflow tab behavior Material 3's Primary/Secondary Tab spec
  applies, but none of the current 32 screens require it.

### 8.15 Navigation
- **Bottom navigation bar** (Compact/Medium): 5 items max (Home, Files,
  Matching, Contracts, Profile), `label-sm-mobile` labels, active state =
  filled icon + `secondary`/`secondary-container` color + bold label.
- **Side navigation drawer** (Expanded): same item set, full labels at
  `label-md`, rounded-full active-state pill (already implemented).
- Both must always represent a **single-user application** — no
  team/organization switcher, consistent with the finalized single-user
  navigation correction already applied.

### 8.16 Date Pickers
- **[NEW — not present in current screens]** Standard Material 3 calendar
  picker adopted for contract start/expiration date entry, with the
  RTL-aware requirement that the calendar grid mirrors and uses the
  numeral-system rule from §3.3 (Persian digits for calendar day numbers in
  Persian locale, per the same reasoning as generic counts).

### 8.17 Progress Indicators
- **Determinate** (linear, with percentage): used for backup/restore
  progress (`settings_backup_management`, `restore_progress`) —
  `bg-surface-container-high` track, `bg-secondary` fill, rounded ends.
- **Indeterminate** (circular spinner): used for brief local validation
  steps (e.g. `restore_select_backup`'s "Validating file format...").
- **[OFFLINE-FIRST RULE]** — see §19: indeterminate spinners must **not**
  be used for instantaneous local reads (file list load, search) — reserved
  for operations with genuine, variable duration (encryption, large-file
  validation).

### 8.18 Skeletons
- **[Documented but not yet visually demonstrated in any Stitch screen]**
  Per `executive_precision/DESIGN.md`: skeleton loaders must match the exact
  shape/layout of the card they replace, animating between
  `surface-container-low` (`#f3f4f5`) and `background` (`#f8f9fa`) — kept as
  the authoritative rule; flagged in the audit as a screen state genuinely
  missing from the delivered set (Category D — a gap, not a deviation from
  an existing pattern, since none exists yet to deviate from).

### 8.19 Empty States
- **[Not yet demonstrated in any screen]** Standard anatomy: centered icon
  (`icon-xl`, §13) + `title-sm` heading + `body-sm` supporting text +
  optional primary action button. Flagged as missing (Category D in the
  audit).

### 8.20 Error States
- Distinguish **field-level validation errors** (§8.3, inline) from
  **operation-level errors** (a dedicated error screen/state, e.g.
  `restore_corrupted_backup`, `restore_failure`) — both patterns already
  exist and are kept as the two canonical error presentations.

### 8.21 Confirmation Dialogs
- See §8.11 (bottom-sheet anatomy) and the dedicated destructive-action
  rules already established: explicit named actions (never a bare "OK"),
  consequence stated in plain language, affected-data specifics named
  where possible (`ui_destructive_confirmation`,
  `restore_existing_data_warning` — both compliant, Category A).

---

## 9. Touch Targets

**Minimum interactive target: 48×48dp** (Material 3's standard), treated as
the **effective/hit-area** minimum — not necessarily the *visual* icon or
control size, per the brief's explicit instruction not to visually enlarge
icons just to satisfy a touch-target rule.

Audit of existing interactive elements against this minimum:

| Element | Visual size | Effective target (with padding) | Verdict |
|---|---|---|---|
| Primary buttons | Full width × ~48-56px | Same | **Compliant** |
| Back/close icon buttons | 40×40px container | 40×40px (no extra hit-area padding currently defined) | **Below minimum — Category D**, needs an invisible hit-area expansion to 48×48px in implementation (visual size unchanged) |
| Bottom nav items | ~64px tall touch column | Compliant | **Compliant** |
| List rows | Full-width, `py-4`+ internal padding → 56-72px row height | Compliant | **Compliant** |
| Chips (filter/amenity) | ~32-36px tall | Below 48px | **[EXCEPTION — documented]**: chips are Material 3's own accepted exception (compact, multi-item selection contexts where 48px per chip would be impractically large); acceptable as-is per Material 3 guidance, provided adjacent chips have adequate `space-2` gap to prevent mis-taps |
| Checkbox/radio controls (restore confirmation, priority toggles) | ~16-20px visual, but wrapped in a larger `<label>` with padding | Compliant (the label, not the control itself, is the tap target) | **Compliant** |

**Rule for implementation**: any icon-only control smaller than 48×48px
visually must receive `min-width`/`min-height: 48px` with the icon centered
inside via flex/grid centering — the icon does not grow, only its
tappable/clickable bounding box does.

---

## 10. Shape / Corner Radius

Authoritative, matching the reconciliation already applied across all 32
screens (§1):

| Token | Value | Maps to |
|---|---|---|
| `radius-none` | 0px | Full-bleed edge-to-edge elements only |
| `radius-small` | `sm` = 2px (0.125rem) | Rarely used standalone; smallest interactive corner |
| `radius-medium` | `DEFAULT` = 4px (0.25rem) | Input fields, small buttons, chips-as-rectangles |
| `radius-large` | `lg` = 8px (0.5rem) | Primary buttons, list-item cards, standard containers |
| `radius-extra-large` | `xl` = 12px (0.75rem) | Detail cards, dialogs, larger containers |
| `radius-full` | 9999px | Circular icon buttons, pills, chips, avatars, segmented-control tracks |
| **`radius-container-lg`** [documented exception, §8.10] | 16px | Bottom-sheet/dialog top corners specifically — outside the step scale by design, since Material 3 itself treats sheet/dialog containers as a distinct shape category from in-page components |

Every component in §8 maps to exactly one of these — no arbitrary radius
value is permitted. This resolves and **keeps resolved** the border-radius
mismatch identified and fixed in the prior correction pass.

---

## 11. Elevation / Depth

Per `executive_precision/DESIGN.md`: **tonal layering over heavy shadows**.
Formalized as explicit tokens rather than raw Tailwind shadow utilities:

| Token | Shadow | Usage |
|---|---|---|
| `elevation-0` | None (border only, `border-outline-variant`) | Cards nested inside an already-elevated surface; flat list rows |
| `elevation-1` | `0 4px 24px rgba(0,0,0,0.04)` (already used on the phone-entry card) | Default resting card/container elevation |
| `elevation-2` | `shadow-sm` (Tailwind default, ~`0 1px 3px rgba(0,0,0,0.1)`) | Slightly raised elements — kept minimal, used sparingly |
| `elevation-3` | `shadow-xl` | Desktop navigation drawer (already used) |
| `elevation-4` | `shadow-2xl` | Bottom sheets and dialogs only — the single highest elevation in the system, reserved for the topmost interactive layer |

**Rule**: elevation is used only to communicate stacking hierarchy (what's
on top of what), never as decoration. No component may use an elevation
higher than `elevation-4`. This keeps the visual language minimal, premium,
calm, and professional as required — Material 3's full 0-5 tonal elevation
range is deliberately not adopted in full; AZAR uses 5 steps (0-4) mapped
to fewer distinct shadow treatments than Material 3's reference palette.

---

## 12. Color System

Semantic tokens (already implemented consistently across all 32 screens),
documented against Material 3's semantic role model. **Reconciliation
note**: `executive_precision/DESIGN.md`'s prose descriptions ("Deep Charcoal
#1A1C1E," "Emerald #2D5A27," "Muted Blue #335C67") do not precisely match
the actual implemented token hex values below — the **implemented tokens are
authoritative**; the prose is a documentation inaccuracy to fix in
`DESIGN.md` itself (flagged in the audit, not corrected here since that
would modify the design package rather than document it).

| Token | Light value | Usage | RTL/Persian note | Accessibility |
|---|---|---|---|---|
| `primary` | `#000101` | Primary buttons, key icons, brand anchor | No directional meaning | On white background: contrast ratio ~20:1, far exceeds AA |
| `on-primary` | `#ffffff` | Text/icons on `primary` fill | — | Compliant (inverse of above) |
| `primary-container` | `#1a1c1e` | Elevated dark surfaces (desktop nav drawer) | — | `on-primary-container` (`#838486`) on this: ~3.9:1 — **borderline for small text, flagged Category D**, verify against actual usage (currently only used for metadata-weight text, which mitigates but should be checked in implementation) |
| `on-primary-container` | `#838486` | Text on `primary-container` | — | See above |
| `secondary` | `#3b6934` | Positive/status accents, active nav state text | — | On white: ~5.9:1, compliant |
| `secondary-container` | `#b9eeab` | Active/selected state fills (bottom nav active pill) | — | `on-secondary-container` (`#3f6d38`) on this: ~4.6:1, compliant |
| `surface` / `background` | `#f8f9fa` | Page background | — | Base canvas |
| `surface-container` / `-low` / `-high` / `-highest` | `#edeeef` / `#f3f4f5` / `#e7e8e9` / `#e1e3e4` | Layered container backgrounds (cards on cards, banners, input fields) | — | All near-white, used for hierarchy not contrast |
| `surface-container-lowest` | `#ffffff` | Primary card/sheet background | — | Max contrast surface |
| `on-surface` | `#191c1d` | Primary text | — | ~15.6:1 on `surface` — compliant |
| `on-surface-variant` | `#44474a` | Secondary text, labels | — | ~7.7:1 on `surface` — compliant |
| `outline` / `outline-variant` | `#75777a` / `#c5c6ca` | Borders, dividers | — | Structural only, not text |
| `error` | `#ba1a1a` | Error text, destructive buttons, mismatched-criteria indicators | — | ~5.9:1 on white — compliant |
| `error-container` | `#ffdad6` | Error banners, mismatch-highlight backgrounds | — | `on-error-container` (`#93000a`) on this: ~7.2:1 — compliant |
| **`success`** [documented, not a separate token — mapped] | = `secondary` (`#3b6934`) | Success confirmations (restore success, save confirmations) | — | Reuses `secondary` rather than introducing a new hue — deliberate, since AZAR's palette treats "positive" as a single semantic color (already how "Active" status chips and checkmarks are colored) |
| **`warning`** [documented, not a separate token — mapped] | = `tertiary-fixed-dim` (`#a3cdda`) family / amber-adjacent use via `error-container` at lower emphasis for "urgent but not failed" states (e.g. contract-expiring-soon indicators, which currently use red/error-family tones at varying opacity, e.g. the "3 Days Left" chip) | Contract urgency tiers | — | **[Category B — should be normalized]**: today "Urgent," "Follow-up Required," and true errors all visually borrow from the `error` family at different tints, which works but isn't a formally distinct `warning` token — recommend a dedicated `warning`/`on-warning` pair (amber-family, distinct from `error`'s red) in a future palette pass rather than reusing red-family tints for two different severities |
| **`info`** [documented, not a separate token — mapped] | = `tertiary-container`/`on-tertiary-container` (`#001f26`/`#618a96`) | Informational banners (local-notification banner, "unsaved changes" banner) | — | Compliant, already in consistent use |

**Dark mode**: not present anywhere in the current Stitch set (`darkMode:
"class"` is configured in every file's Tailwind config, but no
`dark:` variant classes define an actual dark palette beyond a handful of
incidental `dark:` utility classes on the RTL match-explanation screen's nav
— e.g. `dark:bg-background`). **Flagged as a real gap** (Category D): dark
mode is technically wired for but not designed. Not resolved here — a
dedicated dark-palette design pass is required before it can be documented
as implementation-ready.

**Do not encode meaning using color alone** — already followed consistently
(status chips pair color with text labels; match criteria use icon shape
`check_circle`/`error`/`info` in addition to color; destructive actions use
explicit button text, not just red color).

---

## 13. Iconography

- **Family**: Material Symbols Outlined exclusively (already the case in
  100% of screens) — Outlined weight only, never Filled/Rounded/Sharp
  variants, for visual consistency with the "soft-flat," non-decorative
  brand direction.
- **Weight/fill philosophy**: default `FILL 0` (outline); `FILL 1` reserved
  **exclusively** for active/selected navigation state (already the
  pattern via `data-weight="fill"`) — never used decoratively.
- **Sizes** (consolidating the ad hoc 10/14/16/18/20/24/28/32/48px values
  found in the audit into six named steps):

| Token | Size | Usage |
|---|---|---|
| `icon-2xs` | 14px | Rare inline metadata icons (e.g. next to a timestamp) |
| `icon-xs` | 16px | Chip/badge leading icons |
| `icon-sm` | 18px | Button leading icons, list-item secondary icons |
| `icon-md` | 20-24px | **Default** — most UI icons (nav, form fields, list leading icons); the existing set uses both 20 and 24 somewhat interchangeably for this role — implementation should standardize on **24px as the single default** and reserve 20px only where 24px doesn't fit an established compact component (documented as a Category B normalization, not a new rule) |
| `icon-lg` | 32px | Status/illustrative icons (dialog headers, empty states) |
| `icon-xl` | 48px | Reserved for empty-state/onboarding illustrations only |

- **Alignment**: vertically centered with adjacent text via flex
  `items-center` (already universal).
- **Spacing**: `space-2` (8px) icon-to-text gap by default, `space-1` (4px)
  in compact chips (§5.1).
- **RTL mirroring rules** — explicit, since the brief specifically asks
  which icons must and must not mirror:

| Icon category | Mirror in RTL? | Examples |
|---|---|---|
| Directional navigation (back/forward arrows) | **Yes, mirror** | `arrow_back`, `arrow_forward` — already correctly handled via `-scale-x-100` in every RTL screen |
| Directional data icons implying sequence/comparison | **Yes, mirror** | `swap_vert`/`swap_horiz` used between applicant/property in match screens (already mirrored) |
| Entity/object icons (no inherent direction) | **No, do not mirror** | `home`, `folder_open`, `description`, `person`, `location_on`, `pool`, `bed`, `payments`, `check_circle`, `error`, `warning` — mirroring these would be actively wrong (a pool icon doesn't have a "direction") |
| Text-flow/reading icons | **Case-by-case** | e.g. `menu` (hamburger) — conventionally **not** mirrored even in RTL products, kept as-is |

- **Semantic icon rules**: `check_circle` = matched/positive,
  `error`/`warning` = mismatched/attention-needed, `info` = neutral
  informational, `visibility_off` = ignored/excluded (already the exact
  pattern established for the Ignored-criteria section in the corrected
  match-explanation screen).
- **[EXPLICIT PROHIBITION, carrying forward the Phase 3 UI correction]**: no
  decorative icon may imply AI or cloud functionality unless that
  functionality is an explicitly approved product feature. `auto_awesome`
  (sparkle) and cloud-shaped status icons (`cloud_done`) are **banned**
  from this product's iconography — confirmed removed in the correction
  pass and re-stated here as a permanent design-system rule, not a one-time
  fix.

---

## 14. Motion System

**[NEW — no motion system existed as documented tokens before this
document]**, though the Stitch set already used a small, consistent motion
vocabulary that this formalizes rather than replaces:

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | 150ms | Micro-interactions: button hover/press color changes |
| `duration-standard` | 200ms | Default transitions: `transition-colors`, `active:scale` press feedback (already the dominant value, e.g. `duration-200` on nav item press states) |
| `duration-moderate` | 300ms | Bottom-sheet slide-up (already the exact value used, `slideUp 0.3s`) |
| `easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for all transitions (Material 3 standard easing, already the exact curve used for bottom-sheet motion) |

**Transition types**:
- **Press feedback**: `active:scale-[0.98]` + `duration-standard` (already
  universal on buttons/nav items) — kept as the sole press-feedback pattern,
  no ripple effect (ripples are a Material 3 default this product
  deliberately omits, consistent with the minimal/calm brand direction).
- **Bottom-sheet entrance**: `slideUp`, `duration-moderate`,
  `easing-standard` (already implemented).
- **Navigation transitions**: not demonstrated in static screens (no
  page-to-page transition exists to observe) — **[OPEN-ARCH, implementation
  phase]**: recommend a simple cross-fade or platform-native push
  transition, `duration-standard`, rather than inventing a custom one; do
  not add a bespoke page-transition animation system.
- **Loading transitions**: skeleton pulse (documented in DESIGN.md,
  §8.18) — recommend `duration` ~1200-1500ms ease-in-out pulse, standard
  skeleton-loading timing, not yet demonstrated visually.
- **Success feedback**: static checkmark/success-color state changes only
  (no animation currently used for e.g. `restore_success`) — kept minimal
  deliberately; do not add a celebratory animation, which would conflict
  with "calm, professional."
- **Destructive-action feedback**: none beyond the standard press feedback —
  the confirmation *dialog itself* (§8.11/§8.21) is the feedback mechanism,
  not an animation.

**[OFFLINE-FIRST MOTION RULE — see §19]**: motion must never be used to
paper over unnecessary waiting. A local operation that completes in under
~100ms should show **no** loading transition at all — appear instantly.
Motion is reserved for operations with real, variable duration (backup
encryption, restore) or for deliberate micro-feedback (press states, sheet
entrance) — never as a stalling tactic.

---

## 15. Interaction States

Every interactive component must visibly support the states below. Per the
brief, **states must never rely on color alone** — each state pairs a color
change with a structural change (opacity, icon, border, or text).

| State | Treatment |
|---|---|
| Enabled | Default token colors per §12 |
| Pressed | `active:scale-[0.98]` (structural) + slight opacity/color shift |
| Focused | `focus:ring-1 focus:ring-primary` + `focus:border-primary` (already used on text fields) — **[Category D gap]**: focus rings are only consistently demonstrated on text fields; buttons/icon-buttons/nav items do not show an explicit keyboard-focus treatment anywhere in the current set — needed for accessibility (§20) and flagged as a genuine gap to close, not yet a deviation from an established pattern |
| Disabled | `opacity-50 cursor-not-allowed` (structural, not just a color swap) — already the pattern on the Owner Edit form's Save button |
| Loading | Component-specific: buttons may show a spinner replacing their label; full operations use §8.17's progress indicators |
| Error | Border color change (`border-error`) + explicit icon (`error`) + error text (`body-sm`, `error` color) — three simultaneous signals, never color alone |
| Success | Icon (`check_circle`) + text, e.g. `restore_success` — structural, not color-only |
| Selected | Filled/tonal background change + (for priority/segmented controls) bold text weight change — structural, not color-only |
| Dragged | Not applicable — no drag-and-drop interaction exists anywhere in the current product scope |

---

## 16. Form Design System

Standardized field anatomy (already the consistent pattern across
`file_creation_property_entry`, `applicant_smart_requirements`,
`file_management_owner_edit`, `file_management_applicant_edit`,
`settings_backup_management`):

```
Label (label-md, space-2 gap below)
  ↓
Field (text input / segmented control / stepper / slider / chip group)
  ↓ (space-1 gap)
Helper text or Error text (body-sm)
  ↓ (space-6 gap)
Next field label
```

- **Required indicator**: **[Category D gap]** — no required/optional
  marker is visually demonstrated anywhere in the current form screens (all
  fields appear implicitly required). Recommend a trailing `*` on the label
  for required fields, or an explicit "(optional)" `label-sm`-styled suffix
  for optional ones, once field-level requirement rules are defined at the
  data-model level (Phase 4) — not designed here since it depends on which
  fields are actually optional.
- **Keyboard type**: not specified anywhere in the static HTML (no
  `inputmode`/`type` differentiation shown beyond the OTP screen's
  `inputmode="numeric"`) — **[implementation-phase requirement, not a
  design-system value]**: every numeric field (price, area, bedrooms) must
  use `inputmode="numeric"` or `type="number"`; phone fields
  `inputmode="tel"`; email fields `inputmode="email"`.
- **Focus behavior**: move-to-next-field-on-complete is already implemented
  for the OTP entry screen specifically (auto-advance between digit boxes)
  — this pattern should **not** be generalized to ordinary multi-field
  forms (property/applicant entry), where deliberate label-by-label
  navigation is more appropriate for data agents are actively verifying,
  not blind-entering.
- **Validation**: on-blur or on-submit (not demonstrated as on-keystroke
  anywhere) — recommend on-blur for individual fields, on-submit for
  cross-field validation, consistent with "minimal, fast" form completion
  (Phase 1 §16) rather than interrupting typing.
- **Save behavior**: explicit Save/Cancel buttons in a fixed footer
  (already universal) — no autosave-without-confirmation pattern exists in
  any form screen, consistent with Phase 1 §16's autosave-for-drafts
  guidance being about *not losing data*, not about silently committing
  changes without the user choosing to save.

**One-handed speed rule**: every form uses smart-default inputs (segmented
controls, steppers, sliders, chips) over free-typing wherever the field is
enumerable — already the case in 100% of the form screens audited; no
exceptions found.

---

## 17. List Design System

| Property | Standard |
|---|---|
| Row height | 56-72px (driven by `space-4` vertical padding + content, not a fixed height — already the pattern) |
| Leading icon/avatar | 40-48px circular or `radius-medium` square, `surface-container-low` background when no image |
| Primary text | `title-sm` or `label-md` depending on density (detail-adjacent lists use `title-sm`; dense data lists use `label-md`) |
| Secondary text | `body-sm` |
| Trailing action | Icon button (§8.2) or status chip (§8.6), never both without a clear hierarchy |
| Badge | `label-sm`, `radius-full` pill |
| Divider | `border-outline-variant`, full-bleed or inset-matching-content (both patterns exist; inset preferred for lists with leading icons, full-bleed for simple text lists) |
| Swipe behavior | **[Not demonstrated in any current screen]** — Phase 1 §16 calls for swipe actions "where appropriate"; not designed here since no screen shows it yet — flagged as a Category D gap for a future pass, with the explicit requirement (already in Phase 1 docs) that any swipe action must have a non-gesture equivalent (overflow menu) |
| Selection | Not demonstrated (no multi-select list screen exists yet) |
| Empty state | See §8.19 — not demonstrated, flagged as a gap |
| Loading state | See §8.18 — not demonstrated, flagged as a gap |

**Per-list-type notes**:
- **Owner files / Applicant files** (`file_management_all_files`): status
  chip (Active/Pending/Closed) trailing, price + type as secondary
  structured data — already well-specified, Category A.
- **Match results** (`matching_ranked_results`): score as a prominent
  trailing numeral (not a chip — deliberately larger/bolder than a status
  chip to reflect its primary importance), 2-3 inline matched/mismatched
  reason rows beneath — already well-specified, Category A.
- **Contracts** (`contract_management_timeline`): grouped by urgency tier
  with a colored left-edge indicator bar rather than a leading icon —
  already well-specified, Category A, though see §12's `warning` token gap.
- **Backup history** (`settings_backup_security`,
  `settings_backup_management`): status icon (check/error) leading,
  filename + timestamp + size trailing — already well-specified, Category A.

---

## 18. Matching UI System

Dedicated rules, directly enforcing Phase 0 Decision 3 (deterministic,
explainable, non-AI matching) at the visual-design level:

### 18.1 Priority chips
| Priority | Token color | Visual treatment |
|---|---|---|
| `MUST_HAVE` | `primary` fill, `on-primary` text | Solid black-family fill — highest visual weight, signaling a hard constraint |
| `IMPORTANT` | `secondary-container` fill, `on-secondary-container` text | Green-family tonal fill — positive weight, softer than Must Have |
| `PREFERRED` | `surface-container-high` fill, `primary` text | Neutral tonal fill — lowest-emphasis non-ignored state |
| `IGNORE` | `surface-container-low` fill, `on-surface-variant` text, `outline-variant` border | Explicitly muted/outlined — visually communicates "excluded from scoring," not just "low priority" |

Already exactly this four-way system in `applicant_smart_requirements` and
`file_management_applicant_detail` — Category A, kept as the authoritative
spec.

### 18.2 Score presentation
- Large, bold numeral (`display`-adjacent weight but list-context-sized,
  e.g. the 32-40px score numerals in `matching_ranked_results` and the
  circular 48px score in the match-explanation screen) + a `%` unit +
  a `label-sm` "Score" caption beneath. Never a bare unlabeled number.

### 18.3 Match status / explanation sections
Four explicit, always-present groupings (never fewer, even if a group is
empty — an empty group should say "None" rather than disappear, to avoid
implying the system forgot to check):
1. **Matched / Strongest Links** (`check_circle`, `secondary`-family)
2. **Partial / Minor Differences** (`info`, `tertiary`-family)
3. **Mismatched** (`warning`/`error`, `error`-family)
4. **Ignored** (`visibility_off`, `outline`/neutral) — **must always be
   visually present as its own section**, per the corrected match-
   explanation screen; this is the one rule this system treats as
   non-negotiable, since its absence was the core AI-implication defect
   corrected in the prior pass.

### 18.4 Mandatory communication rule
The matching UI must always visually and textually communicate: **this
result is deterministic, rule-based, and explainable** — e.g. via plain-
language panel titles ("Match Explanation," never "Analysis" alone without
qualification) and structured criterion-by-criterion breakdowns (§18.3),
never a single opaque score with no breakdown.

**Explicitly and permanently prohibited** (re-stated from §13's icon rule
and the Phase 3 correction, now a standing design-system rule, not a
one-time fix): "AI Match," "Smart AI," "AI Analysis," sparkle/`auto_awesome`
iconography, or any visual language implying the deterministic engine's
output was generated by an AI model.

---

## 19. Offline-First Visual Language

A dedicated, restrained system — per the brief's explicit instruction not
to show unnecessary offline warnings during normal (local) operation:

| Connectivity state | Visual treatment | When shown |
|---|---|---|
| **Local operation** (the default — everything in `/docs/01-product-requirements.md` §4a's OFFLINE list) | **No indicator at all.** Screens render, save, search, and match exactly the same regardless of connectivity. | Always, for OFFLINE-classified workflows — this is not a "state" that needs signaling, it's simply how the app works |
| **Network required** (registration, OTP, referral validation — §4a's ONLINE_REQUIRED list) | A scoped, inline message at the point of the action itself (e.g. "Sending the verification code requires an internet connection"), never a global banner | Only when the user actually reaches an online-required action while offline |
| **Network unavailable** (an online-required action was attempted and failed specifically due to connectivity) | Same scoped inline treatment, distinguished from other error types per the NETWORK FAILURE vs. AUTHENTICATION FAILURE rule (`/docs/security/authentication-otp-architecture.md`) | Only at the moment of a failed online-required attempt |

**Explicit prohibition**: no persistent "You are offline" banner, no global
connectivity icon in the app chrome, no dimmed/disabled appearance for
OFFLINE-classified screens or actions based on connectivity state. This
directly implements the Phase 1/2 requirement (OFF-03) that offline is the
*normal* mode, not a degraded one, and prevents the design system from
accidentally reintroducing the kind of misleading network-dependency
signal the Cloud Sync/"Network Timeout" backup-history entry represented
before it was corrected.

---

## 20. Accessibility Checklist

Baseline requirement (Phase 1 §16), not a stretch goal; full WCAG
certification remains out of scope per Phase 0's original instruction, but
this checklist is the practical bar for implementation:

- [ ] **Contrast**: every text/background pairing in §12 meets 4.5:1 (body
      text) / 3:1 (large text, 18px+/14px+bold) — all pairings in §12
      verified compliant except the flagged `on-primary-container` /
      `primary-container` borderline case.
- [ ] **Typography**: no text below `label-sm-mobile`'s 10px anywhere (its
      documented ceiling — bottom nav labels only); body text never below
      `body-sm` (14px).
- [ ] **Touch targets**: 48×48dp minimum per §9, with the flagged icon-
      button exception (40px visual, needs 48px hit-area) to be closed in
      implementation.
- [ ] **Focus**: visible focus indicator on every interactive element,
      including buttons/icon-buttons/nav items — currently only
      demonstrated on text fields (§15 gap), must be extended to all
      components in implementation.
- [ ] **Screen-reader semantics**: form fields already show proper
      `<label for="...">` association in the reference HTML (good
      foundation); icon-only buttons need `aria-label`s (e.g. "Go back,"
      "Close") — not consistently present in the current static HTML and
      must be added in implementation, since these are illustrative
      mockups, not the final markup.
- [ ] **Color independence**: verified compliant per §12/§15 — every state
      pairs color with an icon, text, or structural change.
- [ ] **Text scaling**: not testable from static screenshots; requirement
      carried forward for implementation — layouts must not break at up to
      200% system text scaling (standard mobile-OS accessibility
      requirement).
- [ ] **RTL readability**: verified for 6 of the 7 RTL screens, which
      already use Vazirmatn (§3.2); the 1 remaining screen
      (`dashboard_home_persian_rtl`) still on Latin-font fallback for
      Persian text needs normalization (Category B, audit).

---

## 21. Design Tokens (machine-readable)

The complete numeric token set from this document is published as
`/docs/ui/design-tokens.json`. `design-system.md` (this document) explains
*why* and *how to use* each value; `design-tokens.json` is the
implementation-facing source of numeric truth — the two must never state
conflicting values, and any future change to a value must update both files
together.
