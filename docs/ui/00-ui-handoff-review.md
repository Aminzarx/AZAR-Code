# UI/UX Design Handoff Review (Stitch)

Status: DRAFT — review only. No application code was written or modified. No
dependencies installed. No database schema created. This document evaluates
the delivered Stitch design set against `/docs/01-product-requirements.md`,
`/docs/02-user-stories.md`, and the full `/docs/architecture/` Phase 3 set.
Date: 2026-08-08

## Source of the design files

Delivered as `stitch_elite_real_estate_crm.zip`, containing 9 screen exports
(each a `screen.png` + a static `code.html` reference implementation) plus a
`DESIGN.md` design-system spec, under the design name **"Executive
Precision"** / product-facing name **"EstatePro CRM"**. Only one version of
each screen was found — no duplicates or superseded versions to reconcile.
The raw files remain in the session's scratch area (design assets, not
application code) and have **not** been copied into the git repository as
part of this review — this document is the record of their content; the
binary assets themselves can be added to the repo separately if the project
owner wants them version-controlled.

---

## 1. Design files discovered

| Folder | Contents |
|---|---|
| `executive_precision/` | `DESIGN.md` — design-system spec (colors, typography, spacing, radius, shadows, component guidance) |
| `authentication_phone_entry/` | `screen.png`, `code.html` |
| `authentication_otp_verification/` | `screen.png`, `code.html` |
| `authentication_referral_code/` | `screen.png`, `code.html` |
| `dashboard_home/` | `screen.png`, `code.html` |
| `file_management_all_files/` | `screen.png`, `code.html` |
| `file_creation_property_entry/` | `screen.png`, `code.html` |
| `applicant_smart_requirements/` | `screen.png`, `code.html` |
| `smart_matching_match_explanation/` | `screen.png`, `code.html` |
| `contract_management_timeline/` | `screen.png`, `code.html` |
| `settings_backup_security/` | `screen.png`, `code.html` |

Each `code.html` is a static Tailwind-based mockup (not a working app —
buttons/links are inert `href="#"`/`type="button"`), useful here purely as a
precise reference for layout, copy, and embedded design tokens.

## 2. Screens discovered

9 screens: phone entry (login), OTP verification, referral code entry,
dashboard/home, file list (owners+applicants, tabbed), property (owner file)
creation — step 1 of 2, applicant requirement/priority entry, match
explanation detail, contract expiration timeline, backup & security settings.

## 3. Workflows covered (at least partially)

- Authentication: phone entry, OTP entry, referral code entry (three separate
  screens — order between them is not established by the static files, see
  §5 conflict C1).
- Owner file creation (step 1 of 2: structured fields — type, price,
  location, bedrooms, bathrooms, area, amenities).
- Applicant requirement entry with per-criterion MUST_HAVE/IMPORTANT/
  PREFERRED/IGNORE priority selection.
- File list with search, filter entry point, tabbed Owners/Properties vs.
  Applicants, status chips.
- Match explanation detail (score, applicant/property summary, matched/
  partial/mismatched criteria groupings).
- Contract expiration timeline grouped by urgency, with reminder-sent status
  indicator on one card.
- Backup creation, restore-from-file entry point, automatic-backup
  preference, backup history list (including one failure entry).

## 4. Workflows missing entirely from this delivery

- **Owner/applicant file edit and detail/view screens** — only creation
  (step 1 of 2) and requirement-priority entry are shown; no "view an
  existing file" detail screen, no edit flow.
- **A ranked match-candidate list** (MATCH-01/MATCH-02) — only a single
  match's detail page exists; no screen showing "ranked properties for this
  applicant" or "ranked applicants for this property" as a list.
- **Applicant file's own basic/structured info entry** (name, budget
  qualification, contact info) — only the priority-configuration screen
  exists; the owner side has an explicit "Step 1 of 2: Basic Info" but no
  applicant equivalent was included.
- **Restore workflow states**: choosing a file, password entry, progress,
  success, wrong-password, corrupted-backup, incompatible-version, restore
  onto a device with existing data, safe cancellation, recovery after failed
  restore — none of these are represented; only the entry point ("Restore
  from File" button) exists.
- **Reminder schedule configuration** (the 90/60/30/14/7/3/0-day default and
  its configurability) — no screen for this anywhere, including in Settings.
- **Notification permission states** (denied, fallback) — not represented.
- **Destructive-action confirmation dialogs** (delete file, delete contract,
  restore-overwrite) — not represented anywhere.
- **Loading/skeleton, empty-list, and generic error/retry states** — every
  delivered screen is a populated "happy path" state; none of the 9 screens
  show a loading, empty, or error variant.
- **Network-unavailable states** for the ONLINE_REQUIRED account/referral
  surface (offline registration/login/referral-validation attempt) — not
  represented (see §8 offline-UX findings).
- **RTL / Persian-language screens** — none provided; see §7.

## 5. UI ↔ requirements conflicts

Classified per the requested taxonomy. Documented, not silently resolved.

### C1 — [ARCHITECTURAL ISSUE / REQUIREMENT ISSUE, BLOCKING] "Cloud Sync" in Backup & Security
The `settings_backup_security` screen shows a **"Cloud Sync — Encrypted
remote storage"** toggle, **on by default**, alongside "Automatic Backup."
The backup history list includes multiple **"Automatic Cloud Backup"**
entries (one explicitly failed with **"Network Timeout"**). This directly
contradicts confirmed, binding decisions: **[CONFIRMED — Phase 0 Decision
4]** no cloud backup requirement, no cloud database for business data, and
backup is explicitly a local/offline operation (`/docs/01-product-requirements.md`
§14, §4a; `/docs/backup/backup-architecture-analysis.md`). A backup failing
because of a "Network Timeout" is only possible if backup depends on
network connectivity — which it must not, per Decision 4. **This is
blocking**: it cannot be silently removed or reinterpreted by this review: it
either represents a scope the project owner actually wants (a future,
separate, explicitly-opted-into cloud feature) or a design mistake made
without awareness of the local-first constraint. Reported, not fixed.

### C2 — [ARCHITECTURAL ISSUE, BLOCKING] Named encryption algorithm and server-side password framing
The same screen states **"All local and cloud backups are secured using
AES-256 encryption. Your master password is never stored on our servers."**
This (a) names a specific algorithm where
`/docs/backup/backup-architecture-analysis.md` and
`/docs/security/threat-model.md` explicitly defer that choice, and (b) the
phrase "never stored on our servers" presupposes a server capable of storing
it at all — i.e., a backend with business-relevant custody concerns, which
doesn't exist in the confirmed architecture beyond the small account/
referral surface. This may simply be placeholder/marketing copy from a
generic CRM template Stitch drew from, but it must be corrected before
implementation, not carried through, since a user-facing security claim that
doesn't match the real architecture is itself a trust/compliance problem.

### C3 — [DESIGN ISSUE, BLOCKING per explicit instruction] "Smart Analysis" panel implies AI is deciding the match
The match-explanation screen's narrative panel is labeled **"Smart
Analysis"**, uses an `auto_awesome` (sparkle) icon plus a decorative sparkle
background pattern, and presents a free-text paragraph ("Perfect location and
pool, price is slightly above budget but marked as Low Priority..."). Sparkle
iconography and "Smart [X]" labeling are a widely recognized visual
convention specifically for *AI-generated* content in current app design
language. Per the explicit instruction for this review ("The UI must NOT
imply that AI is making the matching decision. The matching engine is
deterministic and explainable") and Phase 0 Decision 3, this presentation
risks directly contradicting a confirmed, binding product decision —
regardless of whether the underlying sentence is actually template-generated
from deterministic criteria data (which it plausibly is, given the content
below it is accurate to a MUST_HAVE/PREFERRED/mismatched structure). The
*perception* created by the icon and label is the problem. Flagged as
blocking per the task's explicit critical rule (affects product
behavior/perception of a confirmed architectural decision) — not corrected
here.

### C4 — [MISSING UX STATE] No explicit "Ignored" criteria section in match explanation
`/docs/01-product-requirements.md` §9 and MEXP-01 require ignored criteria to
be explicitly listed as ignored (not omitted), so a user can see the
applicant chose to ignore them rather than assume the system forgot. The
match-explanation screen shows Strongest Links (Must-Haves), Minor
Differences (Preferred), and Mismatched (Low Priority), but no "Ignored"
grouping — even though the requirement-priority screen elsewhere in this
same design offers IGNORE as one of the four priority options. If any
criterion is set to IGNORE, this screen currently has nowhere to show it.

### C5 — [REQUIREMENT ISSUE / AMBIGUOUS BEHAVIOR] Team/brokerage/organization concepts throughout
Multiple screens display **"Global Realty Group"**, **"Team Directory"** as a
navigation item, and **"Brokerage Login"** as a link on the referral screen.
Phase 1 (`/docs/01-product-requirements.md` §2, §19.6 Q1) explicitly left
"single-agent tool vs. team/admin accounts" as an **open, unresolved product
question**, with the working assumption being single-agent, no team/shared-
file model. The conceptual data model
(`/docs/database/conceptual-data-model.md`) has no Organization/Team/
Brokerage entity. The design assumes this concept exists and is user-facing
in the navigation. This is not a small wording choice — it implies
multi-tenant data sharing, which would change authorization requirements
(Phase 1 §18) and the data model materially. **Must be resolved as a product
decision before this navigation structure is implementable as shown.**

### C6 — [AMBIGUOUS BEHAVIOR] "Request an Invitation" alternate path
The referral-code screen ("Exclusive Access") includes a **"Request an
Invitation"** link alongside the mandatory referral-code field. Phase 1 §4/
§5.1 states plainly: **"No referral code, no registration. There is no
alternate registration path."** If "Request an Invitation" is meant to lead
to an admin-approval or waitlist flow that eventually issues a referral code
through some other channel, that may be consistent with the letter of the
rule (still gated by a code, just a different acquisition path) — but it is
not specified anywhere in the approved requirements and must be clarified,
not assumed, before implementation.

### C7 — [AMBIGUOUS BEHAVIOR] Registration vs. login flow ordering is unclear
The phone-entry screen is titled "Welcome back — Sign in to your EstatePro
account," framed entirely as a returning-user login, with "Enter Referral
Code" presented as a secondary, optional-looking link at the bottom — not as
part of a clearly separate, mandatory new-registration flow. Separately, the
referral-code screen ("Exclusive Access") reads as a *gate before* phone
entry, not a step *after* OTP verification. Phase 1 §5.1/AUTH-01 describes
mobile number → OTP → referral code as the illustrative order, but doesn't
strictly mandate it — however, the three screens as delivered don't establish
*any* single consistent order, and don't visibly distinguish "new user
registering" from "existing user logging in" as different flows at all. This
needs explicit clarification: is "Exclusive Access" (referral gate) shown
*before* phone entry for new users, and skipped entirely for returning users?
That would resolve the ambiguity, but it is not shown or stated anywhere in
the delivered set.

### C8 — [MISSING UX STATE, security-relevant] No OTP invalid/expired error state shown
The OTP screen's static mockup has no visible wrong-code or expired-code
error state (AUTH-06/REM-adjacent requirement territory) — only the
happy-path 6-box entry plus a resend countdown. Given OTP verification is
part of the account/referral online surface with confirmed rate-limiting/
retry-limit requirements (`/docs/security/authentication-otp-architecture.md`),
this state's absence is notable enough to call out separately from the
general "missing states" list in §4/§8, since it's a security-relevant flow
specifically.

## 6. UX issues (non-conflict, quality-level observations)

- Dashboard header reads **"Good morning, / Hello, Sarah"** — a redundant
  double greeting; recommend consolidating to one line. Minor, cosmetic,
  does not affect product behavior — a candidate for direct correction later
  per the "minor visual inconsistency" allowance in the task instructions,
  not fixed here since this review doesn't touch implementation.
- The "Focus" section on the dashboard truncates a second urgent card
  ("Offer Deadline... 78 Valley R...") at the screen edge in the static
  export — likely a horizontal-scroll carousel in the real implementation,
  but the mockup doesn't make that explicit; worth confirming scroll
  affordance is visually obvious (e.g., partial next-card peek is present,
  which is a reasonable existing affordance).
- Recent Matches on the dashboard show bare percentage badges (98%, 85%)
  with no visible inline explanation — acceptable as a summary/entry point
  *only if* every such badge reliably opens the full match-explanation
  screen (§ Matching UX below); this should be an explicit interaction
  contract, not an assumption.

## 7. Accessibility issues

- **RTL/Persian: entirely unaddressed.** All 9 screens are English-only,
  left-to-right. The review instructions explicitly asked for Persian
  typography, RTL correctness, and number/date presentation review — there
  is nothing to review because no RTL/Persian variant was delivered. This is
  a full gap, not a set of minor issues, and should be raised with whoever
  is producing the Stitch designs if Persian/RTL support is actually in
  scope for this product (PRODUCT.md itself is in English and doesn't state
  a target language/locale — this is worth confirming as a product
  question, not assumed either way).
- Icons that depend only on color for meaning: contract urgency indicators
  use both color *and* text labels ("3 DAYS LEFT" + red tint; "Follow-up
  Required" + warning icon) — reasonably accessible, not color-only.
- Status chips (ACTIVE/PENDING/CLOSED on file cards) use color plus text
  label — acceptable.
- Segmented priority control (Must Have/Important/Preferred/Ignore) relies on
  a filled-black-vs-light-grey distinction for the selected state — contrast
  looks adequate in the static export, but exact contrast ratios were not
  measured (out of scope for this non-WCAG-certification pass, per
  instruction).
- Touch target sizing looks reasonable throughout (buttons and list rows are
  generously sized per the "Executive Precision" spacing scale) — no obvious
  under-sized tap targets observed.
- Form labels are present and visually associated with their fields in the
  reference HTML (e.g., `<label for="phone">`) — a good sign for
  screen-reader compatibility if carried into real implementation, though the
  static mockups' `code.html` is not the real UI code, only a visual
  reference.

## 8. Offline-first UX findings

**This is the most important cross-cutting area to get right**, since
offline is meant to be the *normal* operating mode, not an edge case.

- **No screen currently distinguishes NETWORK REQUIRED from LOCAL
  OPERATION.** None of the 9 screens show an offline indicator, a
  connectivity-required messaging pattern, or any visual language for "this
  specific action needs internet, the rest of the app doesn't." This isn't
  necessarily a defect — Phase 1/2's OFF-03 explicitly warns against a
  blanket "you're offline" banner — but it means this distinction has not
  yet been *designed*, only specified functionally. This is a genuine gap to
  close before implementation, not something to invent silently here.
- **C1 (Cloud Sync) is itself an offline-first violation**, already covered
  above as the most serious finding in this whole review — worth repeating
  in this section specifically because it's the offline-first analysis this
  section exists to catch.
- No screen shows what happens to file creation, matching, or contract
  management when offline — consistent with the *absence* of a designed
  distinction (previous bullet), not with an incorrect design (no screen
  currently gets it wrong for these workflows specifically, they just don't
  address connectivity state at all).
- Positive finding: none of the delivered screens show a blocking
  full-screen "offline" interstitial, a disabled core-feature state
  attributed to connectivity, or a "server unavailable" message for a
  workflow that should be local (file list, matching, contracts, backup all
  render as fully functional, populated screens with no online-dependency
  framing) — this is consistent with (does not contradict) the offline-first
  requirement, it just doesn't yet *demonstrate* the required online/offline
  distinction because no such state was included in this batch.

## 9. Security-sensitive UX findings

- C1 and C2 (above) are the primary security-sensitive findings — a cloud
  sync toggle defaulting on, and a named algorithm/server-custody claim that
  doesn't match the confirmed architecture.
- No backup-password entry, confirmation, or strength-guidance screen was
  provided — this is a security-critical UX surface (per the review
  instructions' explicit flag) and its complete absence from this batch
  means the "safe and understandable UX for these states" requirement is not
  yet demonstrated at all, only implied by the presence of a "Create Local
  Backup" button.
- No wrong-password / corrupted-backup / incompatible-version restore states
  — same gap, security-critical, not yet designed.
- No destructive-action confirmation pattern shown anywhere (delete a file,
  overwrite via restore) — Phase 1 §4/§16 requires this unconditionally; its
  absence from every relevant screen (file list's overflow "more_vert" menu
  presumably includes delete, but no confirmation state was included) is a
  gap to close, not evidence of a problem with what *was* shown.
- The backup history's **"Failed: Network Timeout"** entry is doubly
  concerning: beyond the offline-first conflict (C1), it also demonstrates
  that failure-state UX (a red/error-styled history row) exists as a pattern
  in this design system — which is good — but it's currently only applied to
  a failure mode that shouldn't exist in the first place under the confirmed
  architecture.

## 10. Missing states (consolidated)

Loading/skeleton, empty-list, generic error/retry, disabled, permission-
denied, and cancellation states are absent from all 9 delivered screens —
every screen shown is a single populated "success" frame. Specific
security/product-critical missing states (restore flow, backup password
entry, destructive confirmation, OTP error, reminder configuration, notification
permission) are itemized in §4, §5 (C8), and §9 above rather than repeated
here.

## 11. Design-system observations

- **DESIGN.md is a coherent, well-specified system**: Deep Charcoal primary
  (#1A1C1E-family) on Off-White background, Emerald secondary, Muted Blue
  tertiary, dual-font strategy (Geist for headings/labels, Inter for body),
  8px spacing scale, soft (0.25rem-family) corner radius, tonal-layering
  depth instead of heavy shadows, bottom-sheet-based mobile data entry. This
  is applied consistently across all 9 screens' embedded Tailwind
  configurations — genuinely one system, not nine inconsistent ones.
- **[Minor, correctable] Border-radius token mismatch between DESIGN.md and
  the embedded code**: `DESIGN.md` specifies `rounded: { sm: 0.125rem,
  DEFAULT: 0.25rem, md: 0.375rem, lg: 0.5rem, xl: 0.75rem, full: 9999px }`,
  but every screen's embedded Tailwind config instead defines `borderRadius:
  { DEFAULT: 0.125rem, lg: 0.25rem, xl: 0.5rem, full: 0.75rem }` — each named
  step is shifted down one tier from the documented spec, consistently
  across all 9 files (a systematic mismatch, not a one-off typo). This is a
  clear candidate for direct correction later (per the task's "minor visual
  inconsistency that does not affect product behavior" allowance) since it
  doesn't affect product behavior, only which exact token name maps to which
  pixel radius — flagged here rather than silently fixed, since correcting
  it requires deciding which side (the doc or the implementation) is
  authoritative, which is a design-system decision, not this review's call.
- **Reusable components observed**: segmented priority control (Must Have/
  Important/Preferred/Ignore — directly reusable for every matching
  criterion), status chips (Active/Pending/Closed, urgency badges), bottom
  sheets for data entry, card components (property, applicant, match,
  history-row), a consistent bottom tab bar (Home/Files/Matching/Contracts/
  Profile).
- **Icon-driven category system**: Material Symbols Outlined used
  consistently for entity-type and status icons (payments, location_on,
  pool, local_parking, etc.) — a good foundation for the shared
  owner/applicant field iconography Phase 1 §7/§8 calls for.
- **Dual navigation systems observed**: a mobile bottom tab bar (5 items:
  Home, Files, Matching, Contracts, Profile) appears consistently, but
  several screens also show a hamburger-menu-triggered or always-visible
  sidebar-style list with *additional* items (Team Directory, Settings, Help
  Support, Activity Logs) not present in the bottom tab bar. Whether this
  represents an intentional responsive desktop breakpoint (which would be
  worth reconciling with ADR-001's "genuine mobile app" recommendation) or
  is an artifact of the Stitch template's default desktop preview is
  **unclear from the static files alone** and should be clarified, not
  assumed, before implementation.

## 12. Performance concerns

- List screens (file list, contract timeline) are shown with only 3-4 items
  each — no indication of how these render/perform with a large dataset
  (Phase 1 §17's explicit large-dataset requirement, Phase 0 §11a's tracked
  risk). Not a defect in what was shown, just untested by this design batch.
- The design system's own guidance is good on this front: `DESIGN.md`
  explicitly calls for skeleton loaders "matching the exact shape and layout
  of the cards they replace" — consistent with Phase 1 §16's skeleton-
  loading requirement — but no actual skeleton-state screen was delivered to
  verify this is followed in practice.
- No excessive modal usage observed; bottom sheets are used purposefully for
  data entry per the system's own stated philosophy, consistent with "avoid
  excessive dialogs" (Phase 1 §16).
- Animation usage is not evaluable from static screens/HTML (only a couple
  of CSS transitions were present in the reference code, e.g. button
  hover/active states) — nothing excessive observed, nothing to flag.

## 13. Recommended corrections (non-blocking only)

Per the task's critical rule, only items that are clearly minor/cosmetic and
don't affect product behavior are recommended for direct correction; nothing
in this document has been fixed by this review itself.

- Consolidate the dashboard's redundant double greeting ("Good morning," /
  "Hello, Sarah") into one line.
- Reconcile the border-radius token mismatch between `DESIGN.md` and the
  per-screen embedded Tailwind config (§11) — pick one as authoritative and
  align the other.
- Consider softening "Smart Requirements" / "smart matching algorithm"
  wording on the applicant-priority screen (separate from the blocking C3
  finding on the match-explanation screen) — "smart" alone is more
  ambiguous than the sparkle-icon "Smart Analysis" panel, but worth a
  consistent pass once C3 is resolved, so the product doesn't use
  AI-adjacent language in one place and plain language in another.

## 14. Items ready for implementation (architecturally, pending the blocking items below)

- The design-token system (colors, typography, spacing, radius after
  reconciling §11's mismatch) is ready to extract into a shared design-token
  module.
- The MUST_HAVE/IMPORTANT/PREFERRED/IGNORE segmented control pattern is
  ready to build as a reusable component — it matches Phase 1 §8.1 exactly.
- The bottom-sheet-based data-entry pattern is ready to adopt as the
  standard mobile form pattern (Phase 1 §16).
- The bottom tab bar (5 items) is ready to adopt as the primary navigation
  shell, **once §11's dual-navigation-system question is resolved.**
- Card components for properties/applicants/matches/contracts are ready to
  build as reusable components, pending the missing detail/edit screens
  being designed (§4).

## 15. Items that must be clarified before implementation

1. **C1 — Cloud Sync**: is this a real, separately-scoped future feature the
   project owner wants (explicitly opted-in, clearly not "normal operation"),
   or a design mistake to remove entirely? **Blocking.**
2. **C2 — Named encryption algorithm / server-custody copy**: correct the
   copy to not presuppose a specific algorithm or a server that holds
   password material, consistent with the deferred encryption decision.
   **Blocking.**
3. **C3 — "Smart Analysis" AI-coded presentation**: rename/redesign this
   panel to avoid AI-generated-content visual language, since the underlying
   engine is deterministic. **Blocking.**
4. **C5 — Team/brokerage/organization concepts**: resolve the open
   single-agent-vs-team product question (Phase 1 §19.6 Q1) before this
   navigation structure can be implemented as shown. **Blocking** for the
   affected navigation items specifically.
5. **C6 — "Request an Invitation"**: clarify whether/how this coexists with
   "no referral code, no registration."
6. **C7 — Registration vs. login flow ordering**: establish the actual
   screen sequence and how new-user vs. returning-user is distinguished.
7. Whether RTL/Persian support is in scope for this product at all (§7) —
   currently undemonstrated either way.
8. Whether the dual navigation system (§11) is an intentional
   responsive/desktop mode or a template artifact.
9. All the missing screens/states in §4 and §10 need to be designed before
   their corresponding implementation work can begin — not blocking for
   *starting* implementation of already-covered areas, but blocking for
   those specific workflows.
