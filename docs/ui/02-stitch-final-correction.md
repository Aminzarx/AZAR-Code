# Stitch UI/UX Final Correction Pass

Status: DRAFT — design correction and completion pass, not implementation.
No application code was written or modified. No dependencies were installed
into the application. No database schema was created. This document records
what was changed in the design package itself
(`/design/stitch/stitch_elite_real_estate_crm/`) to resolve the blocking
issues from `/docs/ui/01-stitch-final-validation.md`, plus the
implementation-critical screens that were missing.
Date: 2026-08-08

## Scope note: what "correcting the design" means here

This pass edited and added Stitch-style static HTML/CSS mockups and their
screenshots — design artifacts, not the application. Nothing in
`src/` was touched, no npm dependency was added to the project, and no
database schema exists or was created. Screenshots were regenerated from an
actual rendering of each corrected HTML file (Tailwind CSS compiled from the
same embedded design tokens each file already carried, real Geist/Inter/
Vazirmatn/Material Symbols font files, headless Chromium) so every
`screen.png` in the corrected package is a real, accurate render of its own
`code.html` — not a placeholder and not a stale copy. This directly addresses
the previous validation's packaging finding (F1) about a screenshot that
didn't match its own source.

The corrected package lives at `/design/stitch/stitch_elite_real_estate_crm/`
in this repository (the path the design handoff referenced). This is the
first time Stitch design files have been committed to the repo — prior
review rounds worked from uploaded archives without persisting them.

---

## A. Every blocking issue corrected

### 1. "Smart Analysis" / AI implication — corrected
**Path**: `smart_matching_match_analysis_persian_rtl/code.html`
Removed the "تحلیل هوشمند" ("Smart Analysis") label, the `auto_awesome`
sparkle icon, and its decorative sparkle background entirely. Replaced with
a panel titled "توضیح تطابق" ("Match Explanation") using a plain `rule` icon.
The narrative text was rewritten in Persian to explicitly state the result is
computed deterministically from the user's own structured criteria **without
using artificial intelligence** ("بدون استفاده از هوش مصنوعی"). The
**Ignored** section is now explicitly present as a fourth grouping (matched
[Must-Haves] / partial [Preferred] / mismatched [Low Priority] / **ignored**),
tagged "Ignore", showing a criterion the applicant marked to be excluded from
scoring — satisfying the requirement that ignored criteria be shown, not
omitted.

### 2. Email Alerts — corrected
**Path**: `settings_contract_reminders/code.html`
Removed the "Email Alert Active / Edit Recipients" control entirely. Added an
explicit banner communicating local-only delivery: "Reminders are delivered
as **local notifications on this device**. No internet connection is
required to receive them." No email, SMS, push, or server-mediated channel
appears anywhere in this screen or its RTL counterpart.

### 3. Seven default reminder offsets — corrected
**Path**: `settings_contract_reminders/code.html`
Added the previously missing 7-day and 3-day rows. The screen now shows all
seven confirmed default offsets: 90, 60, 30, 14, 7, 3 days before, and "On
Expiration."
**Note — instruction discrepancy flagged, not silently resolved**: this
correction task's own instructions listed the seventh offset as "1 day
before," but the confirmed, approved product requirement
(`/docs/01-product-requirements.md` §12) is **the expiration day itself (0
days)**, not 1 day before. Since these two are different values and the
correction instructions did not present this as a new product decision, I
implemented the offset that matches the already-approved requirement ("On
Expiration") rather than silently changing a confirmed business rule based on
an inconsistency in these instructions. Flagged here for explicit
confirmation — if "1 day before" was intentional and meant to change the
confirmed default schedule, that is a product decision to make explicitly,
not something this design pass should decide on its own.

### 4. Stale backup screenshot — corrected
**Path**: `settings_backup_security/screen.png`
Regenerated from the current `code.html` via an actual browser render (not
edited metadata, not a renamed file). Verified the new screenshot shows
neither Cloud Sync, AES-256, server storage, nor server custody — matching
its source exactly. Additionally fixed a residual copy inconsistency found
during this pass: a backup history entry read "Automatic Local Backup...
Failed: Network Timeout," which no longer made sense once "Cloud" was
corrected to "Local" — changed to "Failed: Insufficient Storage Space," a
plausible reason for a genuinely local operation to fail. Also replaced the
status-card icon (`cloud_done`) with a non-cloud icon (`verified_user`) so no
cloud-shaped iconography remains even incidentally.

### 5. Team / brokerage navigation — corrected
**Paths**: `contract_management_timeline/code.html`,
`matching_ranked_results/code.html`, `file_management_all_files/code.html`,
`settings_backup_security/code.html` (the only four files that still had it;
`authentication_referral_code` had already lost "Brokerage Login" in the
prior revision)
Removed the "Global Realty Group" organization line and the "Team Directory"
navigation entry from every screen that had them. A full recursive scan (§F
below) confirms zero remaining occurrences of "Global Realty Group," "Team
Directory," or "Brokerage" anywhere in the package's UI text. "Activity Logs"
was kept — it maps to the approved single-user `AuditLogEntry` concept
(`/docs/database/conceptual-data-model.md`), not a team feature.

### 6. Restore workflow — added
Twelve required states, delivered as eight screens (some states are natural
sub-states of the same screen rather than separate ones — mapped explicitly
below):

| Required state | Screen(s) |
|---|---|
| 1. Select Backup | `restore_select_backup/` |
| 2. Backup Validation | `restore_select_backup/` (inline validating indicator shown after selection) |
| 3. Password Entry | `restore_password_entry/` |
| 4. Wrong Password | `restore_password_entry/` (shown as the active state, with attempt count) |
| 5. Corrupted Backup | `restore_corrupted_backup/` |
| 6. Incompatible Backup Version | `restore_incompatible_version/` |
| 7. Existing Local Data Warning | `restore_existing_data_warning/` |
| 8. Explicit Restore Confirmation | `restore_existing_data_warning/` (the same screen — an explicit checkbox plus "Cancel" / "Restore & Replace" buttons, never a bare "OK") |
| 9. Restore Progress | `restore_progress/` |
| 10. Restore Success | `restore_success/` |
| 11. Restore Failure | `restore_failure/` |
| 12. Safe Cancellation | `restore_progress/` (an explicit "Cancel Restore" action, with copy stating existing data is untouched until restore finishes) |

**No silent decision was made about whether restore overwrites existing
data** — the previously open policy question (block vs. overwrite) is
resolved in the *design* only to the extent of making the consequence
explicit and requiring confirmation (per the correction instructions); the
underlying architectural decision remains recorded as open in
`/docs/architecture/unresolved-decisions.md` and is not changed by this pass.

### 7. Applicant Detail screen — added
**Path**: `file_management_applicant_detail/`
Shows applicant basic information, structured property requirements with
explicit MUST_HAVE/IMPORTANT/PREFERRED/IGNORE priority chips per criterion,
restrictions (distinct from priorities), preferences, private notes, and
relevant actions (Edit File, Run Matching) — visually consistent with the
existing Owner Detail screen's card/section layout.

### 8. File edit workflows — added
**Paths**: `file_management_owner_edit/`, `file_management_applicant_edit/`
Both reuse the existing form components (segmented control, price slider,
stepper, amenity chips, priority segmented control) from
`file_creation_property_entry/` and `applicant_smart_requirements/` rather
than inventing new ones. Each includes: an unsaved-changes indicator, a
validation-error example (a required field shown invalid, with the primary
save action disabled until resolved), and explicit Cancel / Save Changes
actions.

### 9. Destructive action confirmations — added
**Path**: `ui_destructive_confirmation/` (a delete-file example, established
as the reusable pattern) plus the restore-specific one folded into
`restore_existing_data_warning/`
Each confirmation states what will happen, what data is affected (named
specifically, e.g. "3 owner files, 5 applicant files, and 2 contracts"), and
whether it can be undone — with explicit `Cancel` / `Delete` or `Cancel` /
`Restore & Replace` actions, never a bare "OK."

### 10. Border-radius token mismatch — corrected
Every one of the 15 pre-existing `code.html` files (plus all newly created
ones, which were built against the corrected values from the start) now
declares the same `borderRadius` scale as `DESIGN.md`: `sm: 0.125rem,
DEFAULT: 0.25rem, md: 0.375rem, lg: 0.5rem, xl: 0.75rem, full: 9999px`. No new
token names were introduced — the existing token names were simply
reconciled to one authoritative source (`DESIGN.md`).

---

## B. Exact affected design paths

**Corrected content** (existing files, edited):
- `contract_management_timeline/code.html` — removed team/brokerage nav
- `matching_ranked_results/code.html` — removed team/brokerage nav
- `file_management_all_files/code.html` — removed team/brokerage nav
- `settings_backup_security/code.html` — removed team/brokerage nav, fixed
  residual "Network Timeout" copy, swapped the status icon
- `settings_contract_reminders/code.html` — removed Email Alert, added 7-day
  and 3-day offsets, added local-notification banner
- `smart_matching_match_analysis_persian_rtl/code.html` — removed Smart
  Analysis/sparkle, added explicit Ignored section, rewrote narrative

**Radius-only correction** (all 15 pre-existing files, mechanical):
`applicant_smart_requirements`, `authentication_otp_verification`,
`authentication_phone_entry`, `authentication_referral_code`,
`contract_management_timeline`, `dashboard_home`,
`dashboard_home_persian_rtl`, `file_creation_property_entry`,
`file_management_all_files`, `file_management_owner_detail`,
`matching_ranked_results`, `settings_backup_management`,
`settings_backup_security`, `settings_contract_reminders`,
`smart_matching_match_analysis_persian_rtl` — each `code.html`'s embedded
`borderRadius` block updated to match `DESIGN.md`.

## C. Screens added (new folders)

`file_management_applicant_detail/`, `file_management_owner_edit/`,
`file_management_applicant_edit/`, `ui_destructive_confirmation/`,
`restore_select_backup/`, `restore_password_entry/`,
`restore_corrupted_backup/`, `restore_incompatible_version/`,
`restore_existing_data_warning/`, `restore_progress/`, `restore_success/`,
`restore_failure/` (12 new LTR screens), plus RTL/Persian variants for the
categories the correction instructions named as especially critical:
`file_management_applicant_detail_persian_rtl/`,
`file_management_owner_edit_persian_rtl/`,
`ui_destructive_confirmation_persian_rtl/`,
`restore_existing_data_warning_persian_rtl/`,
`settings_contract_reminders_persian_rtl/` (5 new RTL screens).

## D. Screens changed (content edits, listed in §B)

Six existing screens had content edited (listed above); nine more had only
the mechanical radius-token correction applied with no other content change.

## E. Screenshots regenerated

**All 32 screens' `screen.png` files were regenerated** from their current
`code.html` via an actual headless-browser render (Tailwind compiled from
each file's own embedded design tokens; real Geist/Inter/Vazirmatn/Material
Symbols fonts; full-page capture with correct handling of fixed navigation
elements) — including the 15 pre-existing screens whose only change was the
radius-token fix, specifically so that fix doesn't create a new instance of
the exact "code changed, screenshot didn't" problem this pass was tasked
with closing. Every screenshot in the corrected package is a real render of
its adjacent `code.html`, not a placeholder or a copy.

**Rendering note**: this sandboxed environment cannot reach
`cdn.tailwindcss.com`, `fonts.googleapis.com`, or the `lh3.googleusercontent.com`
stock-photo URLs used for avatar/property images (network policy denies
those hosts here — confirmed via the proxy status endpoint, not worked
around). The delivered `code.html` files are unchanged in this respect and
will load those exact CDN resources normally for anyone opening them with
real internet access — this is a locally-scoped rendering substitution, not
a change to the deliverable. For the substitute render used only to produce
these screenshots, fonts were sourced from the equivalent official npm
packages (`geist`, `@fontsource/inter`, `material-symbols`, `vazirmatn`) and
Tailwind CSS was compiled locally against each file's own embedded config —
so typography, color, spacing, and radius in every regenerated screenshot are
faithful to the real design tokens. The one visible artifact: avatar and
property photos render as a plain placeholder color block in these
screenshots (their `data-alt` descriptions are intact, and the `src` URLs are
untouched) since those specific external images could not be fetched in this
sandbox.

## F. Remaining missing states

- No English/LTR counterpart to the match-explanation screen exists — only
  the (now-corrected) Persian RTL version. Not in scope for this pass's
  named corrections; flagged for a future pass if an LTR version is wanted.
- Notification-permission-denied guidance screen still does not exist.
- A dedicated empty-state and generic loading/skeleton screen were not added
  for the list screens (file list, matching results, contracts) — out of
  this pass's named scope (blocking items + explicitly listed missing
  screens only).
- The RTL/Persian coverage remains partial by design (5 new + 2 pre-existing
  = 7 of 32 screens) — the correction instructions asked for RTL versions
  "where appropriate" for the newly added critical categories, which was
  interpreted as this representative critical subset rather than 100%
  coverage of all 32 screens; a full RTL pass across every screen would be a
  larger, separate effort.

## G. Remaining product decisions (not resolved by this design pass)

- Whether restore blocks or overwrites when a device already has local data
  — the design now makes the consequence explicit and requires confirmation
  either way, but the underlying architectural policy is still open
  (`/docs/architecture/unresolved-decisions.md`).
- The reminder-offset discrepancy noted in §A.3 ("1 day before" vs. the
  confirmed "expiration day itself") needs explicit confirmation from the
  project owner.
- Single-agent vs. team/brokerage accounts (Phase 1 §19.6 Q1) remains open
  as a product question — this pass removed team/brokerage *navigation* to
  match the current single-agent assumption, but did not resolve the
  underlying open question itself.

## H. Final implementation-readiness assessment

See the final gate classification below. In summary: all five blocking
issues from the prior validation are resolved, and all nine explicitly
requested missing implementation-critical screens now exist. Remaining items
(§F, §G) are non-blocking follow-ups, not defects reintroduced by this pass.

---

## Independent final review

A fresh recursive scan of the corrected package
(`/design/stitch/stitch_elite_real_estate_crm/`) for every previously
prohibited term — Cloud Sync, Smart Analysis, AI, AES-256, server storage,
server backup, email alerts, push notifications, team, brokerage, Global
Realty Group, Team Directory, auto_awesome — returned **zero matches** in
any UI-facing content. All 32 screenshots were confirmed to be fresh renders
of their adjacent, current `code.html` (not stale copies).

## Final gate classification

**READY WITH MINOR FIXES**

No blocking product, security, or architecture conflict remains:
- Cloud Sync: absent.
- Server/cloud business-data storage implication: absent.
- AES-256 claim: absent.
- AI/Smart Analysis matching implication: absent; Ignored section now
  explicit.
- Email/push/network reminder channel: absent; local-only delivery stated
  explicitly in the UI.
- Team/brokerage navigation: absent.
- Restore-critical security states: all twelve present across the eight
  restore screens.

**Minor, non-blocking items** (§F/§G above): no English match-explanation
screen exists (RTL-only); no notification-permission-denied screen; no
empty/loading-state screens were added in this pass; RTL coverage is
representative (7 of 32 screens), not exhaustive; two product decisions
(§G) still need explicit project-owner confirmation before their affected
screens can be treated as fully final, though neither blocks moving forward
with implementation planning on the rest of the package.
