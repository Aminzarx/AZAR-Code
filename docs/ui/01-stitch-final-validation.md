# Stitch UI/UX Revision 2 — Final Validation

Status: DRAFT — review only. No application code was written or modified. No
dependencies installed. No database schema created. Validates the revised
Stitch design package against `/docs/01-product-requirements.md`,
`/docs/02-user-stories.md`, the full `/docs/architecture/` Phase 3 set, and
the prior `/docs/ui/00-ui-handoff-review.md`.
Date: 2026-08-08

## Note on source location

The task referenced `/design/stitch/` as the location of the revised
package. That path does not exist in this repository — no design files have
been committed to the repo at any point in this project. The revised package
was instead found as an uploaded archive
(`stitch_elite_real_estate_crm_1.zip`), extracted to a scratch directory for
this review, exactly as the first round was. This document is based on that
archive's contents. As before, the raw design files were not copied into the
git repository as part of this review — this document is the record of their
content.

---

## A. Design version reviewed

Revision 2 of the "Executive Precision" / "EstatePro CRM" Stitch package: 16
screen folders (each `screen.png` + `code.html`) plus `executive_precision/DESIGN.md`.
Compared file-by-file (SHA-256) against Revision 1 (the package reviewed in
`/docs/ui/00-ui-handoff-review.md`) to distinguish unchanged, changed, added,
and removed files with certainty rather than by visual impression.

## B. Files reviewed (full relative paths, diff status vs. Revision 1)

| Path | Status |
|---|---|
| `stitch_elite_real_estate_crm/applicant_smart_requirements/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/applicant_smart_requirements/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/authentication_otp_verification/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/authentication_otp_verification/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/authentication_phone_entry/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/authentication_phone_entry/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/authentication_referral_code/code.html` | **CHANGED** |
| `stitch_elite_real_estate_crm/authentication_referral_code/screen.png` | **CHANGED** |
| `stitch_elite_real_estate_crm/contract_management_timeline/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/contract_management_timeline/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/dashboard_home/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/dashboard_home/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/dashboard_home_persian_rtl/code.html` | **ADDED** |
| `stitch_elite_real_estate_crm/dashboard_home_persian_rtl/screen.png` | **ADDED** |
| `stitch_elite_real_estate_crm/executive_precision/DESIGN.md` | UNCHANGED |
| `stitch_elite_real_estate_crm/file_creation_property_entry/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/file_creation_property_entry/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/file_management_all_files/code.html` | UNCHANGED |
| `stitch_elite_real_estate_crm/file_management_all_files/screen.png` | UNCHANGED |
| `stitch_elite_real_estate_crm/file_management_owner_detail/code.html` | **ADDED** |
| `stitch_elite_real_estate_crm/file_management_owner_detail/screen.png` | **ADDED** |
| `stitch_elite_real_estate_crm/matching_ranked_results/code.html` | **ADDED** |
| `stitch_elite_real_estate_crm/matching_ranked_results/screen.png` | **ADDED** |
| `stitch_elite_real_estate_crm/settings_backup_management/code.html` | **ADDED** |
| `stitch_elite_real_estate_crm/settings_backup_management/screen.png` | **ADDED** |
| `stitch_elite_real_estate_crm/settings_backup_security/code.html` | **CHANGED** |
| `stitch_elite_real_estate_crm/settings_backup_security/screen.png` | UNCHANGED (byte-identical to Revision 1 — see finding F1) |
| `stitch_elite_real_estate_crm/settings_contract_reminders/code.html` | **ADDED** |
| `stitch_elite_real_estate_crm/settings_contract_reminders/screen.png` | **ADDED** |
| `stitch_elite_real_estate_crm/smart_matching_match_analysis_persian_rtl/code.html` | **ADDED** (replaces `smart_matching_match_explanation/`) |
| `stitch_elite_real_estate_crm/smart_matching_match_analysis_persian_rtl/screen.png` | **ADDED** (replaces `smart_matching_match_explanation/`) |
| `stitch_elite_real_estate_crm/smart_matching_match_explanation/*` | **REMOVED** (present in Rev 1, absent in Rev 2 — no direct English/LTR replacement, see finding F5) |

No duplicate files (by content hash) were found within Revision 2 itself. No
RTL/Persian variant of `authentication_phone_entry`, `authentication_otp_verification`,
`authentication_referral_code`, `file_management_all_files`,
`file_management_owner_detail`, `file_creation_property_entry`,
`contract_management_timeline`, `settings_contract_reminders`,
`settings_backup_security`, or `settings_backup_management` was provided —
only `dashboard_home` and the match-analysis screen received RTL variants.

## C. Previous blockers and their status

### BLOCKER 1 — Cloud Sync / cloud business-data synchronization
**STATUS: RESOLVED IN CODE, but see F1 (stale screenshot).**
`stitch_elite_real_estate_crm/settings_backup_security/code.html` no longer
contains a "Cloud Sync" toggle, any "cloud" preference, or "Automatic Cloud
Backup" / "encrypted remote storage" language. The Preferences section now
shows only "Automatic Backup." Backup History entries were relabeled
"Automatic Local Backup" and "Manual Local Backup." The new
`settings_backup_management/code.html` screen is entirely local-framed
("Local Data: Backup... Export files directly to your device for absolute
control," "Start Local Backup") with no cloud references at all. **However**,
`settings_backup_security/screen.png` is byte-for-byte identical to the
Revision 1 screenshot (same SHA-256 hash) — the image was not regenerated
and still visually shows the old Cloud Sync toggle, AES-256 claim, and
"Automatic Cloud Backup" entries. See F1.

### BLOCKER 2 — Premature encryption/server-storage claims
**STATUS: RESOLVED IN CODE, but see F1 (stale screenshot) and F2 (residual copy inconsistency).**
No "AES-256" or "never stored on our servers" text appears anywhere in
`settings_backup_security/code.html` or `settings_backup_management/code.html`.
The new copy in `settings_backup_security` reads: "Your business data is
protected on your device, and exported backups are encrypted for secure
transfer" — accurate, algorithm-agnostic, no server-custody claim. As with
Blocker 1, the screenshot asset was not regenerated (F1). Additionally, a
residual inconsistency remains: one backup-history entry now reads
**"Automatic Local Backup... Failed: Network Timeout"** (F2) — a "Local"
backup failing due to a network reason is self-contradictory and, if taken
literally, implies local backup depends on connectivity, undermining the
very requirement this fix was meant to satisfy.

### BLOCKER 3 — AI implication in matching
**STATUS: NOT RESOLVED.**
The new ranked-results list
(`matching_ranked_results/code.html`) is clean — plain check/warning icons,
no AI-styled language. But the one match-detail/explanation screen delivered
in this revision, `smart_matching_match_analysis_persian_rtl/code.html`
(Persian RTL), is functionally the same screen as Revision 1's blocked
`smart_matching_match_explanation` — it still carries a "تحلیل هوشمند"
("Smart Analysis") panel with the same `auto_awesome` sparkle icon and
decorative sparkle background, presenting the same free-text narrative. No
English/LTR replacement for this screen was provided, so the only detail
screen available anywhere in this revision still has the flagged AI-implying
presentation. **This blocker remains open and is, if anything, more
consequential now**, since it's the only version of this screen in the
current delivery. See F5.

### BLOCKER 4 — Team/brokerage assumptions
**STATUS: PARTIALLY RESOLVED.**
`authentication_referral_code` had its "Request an Invitation" and
"Brokerage Login" links removed — confirmed by both the code diff and a
visual check of the new screenshot. However, "Global Realty Group" and the
"Team Directory" navigation item still appear, unchanged, in
`settings_backup_security`, `matching_ranked_results`, and
`file_management_owner_detail` (and remain in the untouched
`file_management_all_files` and `contract_management_timeline`). The
underlying open product question (single-agent vs. team/admin accounts,
Phase 1 §19.6 Q1) is still unresolved, and the navigation shell still assumes
an answer that hasn't been given. **Not resolved at the product-navigation
level**, only on the one screen most directly tied to registration.

## D. New screens added

- `dashboard_home_persian_rtl` — RTL/Persian dashboard variant.
- `file_management_owner_detail` — owner file detail/view screen (fills a
  Revision 1 gap). Shows structured fields, ownership details, and a single
  "Private Notes" free-text section; no delete/destructive action visible on
  this screen.
- `matching_ranked_results` — ranked match-candidate list (fills a Revision 1
  gap; see §G).
- `settings_backup_management` — a dedicated backup-creation flow with
  password + confirm-password entry and an in-progress/cancel state (fills a
  Revision 1 gap; see §I).
- `settings_contract_reminders` — reminder-schedule configuration screen
  (fills a Revision 1 gap; see §N for the offset-count issue found).
- `smart_matching_match_analysis_persian_rtl` — replaces Revision 1's match-
  explanation screen, RTL/Persian, but still carries the AI-implying
  presentation (Blocker 3, unresolved).

## E. Missing screens/states (still absent after Revision 2)

- **Any English/LTR match-detail/explanation screen** — only a Persian RTL
  version exists now (see F5).
- **Restore workflow, entirely**: select-backup, validate, password entry,
  wrong-password, corrupted-backup, incompatible-version, existing-local-data
  warning, restore confirmation, progress, success, failure, cancellation —
  none of these were added. "Restore from File" remains a bare entry-point
  button with no follow-through screens in either backup settings screen.
- **File edit screens** (owner or applicant) — "Edit File" is a button on
  `file_management_owner_detail`, but no edit-form screen was delivered.
- **Delete / destructive-action confirmation** for files or contracts —
  still not represented anywhere.
- **Applicant file detail/view screen** — still only the priority-
  configuration screen exists for applicants; no equivalent to
  `file_management_owner_detail` for an applicant record.
- **Notification-permission-denied state** — still absent.
- **Loading/skeleton, empty-list, and generic validation-error states** —
  still absent from every screen; all remain populated "success" frames,
  including all newly added ones (the backup-in-progress state is the one
  exception — a genuine non-trivial loading/progress state, which is a
  positive addition).
- **RTL/Persian coverage is now partial, not absent** (an improvement from
  Revision 1's total gap), but only 2 of 16 screens have an RTL variant — see
  §J.

## F. Requirements/UI conflicts (new findings this round, plus status of prior ones)

### F1 — [PACKAGING ISSUE, must be corrected before sign-off] Stale screenshot contradicts its own updated code
`settings_backup_security/screen.png` is byte-identical to the Revision 1
image and still visually shows the removed Cloud Sync toggle and AES-256/
server-custody copy, even though `settings_backup_security/code.html` was
correctly updated to remove all of that. Since screenshots are the stated
"primary visual reference," this creates a real risk that a reviewer relying
on the image (rather than the code) would wrongly conclude Blockers 1 and 2
are unresolved, or — worse — that they're still part of the design. This
must be corrected (a regenerated screenshot) before this screen can be
signed off as visually validated, even though the underlying code is now
correct.

### F2 — [DESIGN ISSUE, minor but should be fixed] "Local Backup... Failed: Network Timeout"
Covered under Blocker 2 above. A leftover failure-reason string that no
longer matches its own (now-corrected) "Local" framing. Recommend changing
the failure reason to something that makes sense for a local operation
(e.g. "Failed: Insufficient Storage" or "Failed: Interrupted") rather than a
network-based reason.

### F3 — [REQUIREMENT/ARCHITECTURAL ISSUE, NEW, blocking] "Email Alert" / "Edit Recipients" on the reminder settings screen
`settings_contract_reminders/code.html` ties an **"Email Alert Active / Edit
Recipients"** control to the 60-day-before reminder offset. Email delivery
requires a server-mediated notification channel — this is not covered by any
approved decision and directly reintroduces a network dependency into a
workflow that must be entirely local (Phase 0 Decision 4;
`/docs/notifications/notification-architecture.md`: "reminders use local
device notifications, not push... push infrastructure is not required for
v1"). Email is a third channel beyond in-app and local-device notifications
that was never discussed or approved. This is new scope, not a
reinterpretation of something already decided, and must be resolved as a
product decision before this screen can be implemented as shown.

### F4 — [REQUIREMENT CONFLICT, NEW] Reminder schedule shows only 5 of the 7 default offsets, with no way to add the missing two
The confirmed default schedule is 90/60/30/14/**7**/**3**/0 days
(`/docs/01-product-requirements.md` §12). `settings_contract_reminders`
shows toggles for 90, 60, 30, 14, and "On Expiration" only — the 7-day and
3-day offsets are missing entirely, and no "add a reminder offset" control
is visible anywhere on the screen. If this is meant to represent a
user-customized subset rather than the full default set, that's not
indicated anywhere on the screen — as delivered, it reads as the complete
available schedule.

### F5 — Blocker 3 (AI implication) — see §C above; restated here as a conflict entry for completeness, since it is the most significant unresolved item in this revision.

### F6 — Blocker 4 (team/brokerage) — see §C above; partially resolved, restated here for completeness.

### F7 — [MISSING CONCEPT] No separate free-form/public description field demonstrated
Phase 1 §7.2 requires free-form description (user-facing) and internal notes
to be modeled as two distinct fields. `file_management_owner_detail` shows
only one notes field, labeled "Private Notes" (internal). No public-facing
free-form description field is demonstrated on this screen. This may simply
be out of this screen's scope rather than a rejection of the requirement,
but it is not yet demonstrated and should not be assumed satisfied.

## G. Matching UX validation

- **MUST_HAVE/IMPORTANT/PREFERRED/IGNORE**: still correctly represented in
  `applicant_smart_requirements` (unchanged from Revision 1, already
  compliant).
- **Ranked match results**: now present (`matching_ranked_results`) — a
  clean, well-structured addition. Each candidate card shows address,
  price/beds/baths, a percentage score, and 2-3 top reasons marked with
  plain check/warning icons (no AI styling), plus a "View Explanation" link.
  This directly satisfies MATCH-01/MATCH-02's previously-missing ranked-list
  requirement.
- **Matched / partial / mismatched criteria**: shown on both the ranked-list
  cards (via check/warning icons with short reasons) and the detail screen
  (Strongest Links/Must-Haves, Minor Differences/Preferred, Mismatched/Low
  Priority groupings — unchanged structure from Revision 1).
- **Ignored criteria**: **still not explicitly represented** anywhere,
  either on the ranked-list cards or the detail screen. This gap from
  Revision 1 (finding C4 in the prior review) persists unchanged.
- **"Why a result received its score"**: the ranked-list cards' inline
  reasons are a good, transparent pattern ("Price: 5% over max budget,"
  "Space: Missing 3rd bedroom") that reads as rule-based and specific, not
  mysterious. The detail screen's structured sections (Strongest Links,
  Minor Differences, Mismatched) reinforce this. **The one thing undermining
  "not AI-implied" is specifically the "Smart Analysis" narrative panel on
  the detail screen (Blocker 3)** — everything else about the matching
  presentation is consistent with "the matching engine evaluated your
  defined criteria."
- **Free-text/preferences must not incorrectly eliminate a valid match**:
  the ranked-list and detail screens both show properties that don't
  perfectly match (e.g., "5% over max budget," "Missing 3rd bedroom") still
  appearing in results with a lower score rather than being silently
  excluded — this is consistent with the requirement, as long as the
  underlying priority (MUST_HAVE vs. lower) is what actually governs
  exclusion, which the design correctly represents at the data-entry stage
  (`applicant_smart_requirements`). Nothing in this design contradicts the
  requirement; it isn't fully provable from static mockups alone, but no red
  flag was found.

## H. Offline-first validation

- No screen in this revision introduces a new offline-first violation
  **except** F3 (Email Alert) and F2's residual "Network Timeout" copy on a
  now-local-labeled backup entry — both flagged above.
- Blocker 1's resolution (Cloud Sync removal from the code) is a genuine,
  significant improvement for offline-first compliance, once the stale
  screenshot (F1) is corrected.
- As in Revision 1, no screen yet positively demonstrates the NETWORK
  REQUIRED vs. LOCAL OPERATION distinction (e.g., an offline indicator
  specifically scoped to the account/referral surface) — this remains
  undesigned rather than incorrectly designed, same status as before.
- No background business-data synchronization or automatic multi-device
  sync UI was introduced anywhere in this revision — consistent with the
  confirmed non-goal (`/docs/02-user-stories.md` SYNC-02).

## I. Security UX validation

- Backup password entry + confirmation is now present
  (`settings_backup_management`) — a meaningful improvement addressing part
  of the Revision 1 gap in §9/§10 of the original review request.
- Backup-in-progress state with a cancel affordance is present — a genuine,
  well-handled state addition.
- **Still missing**: the entire restore-side security UX (wrong password,
  corrupted backup, incompatible version, existing-local-data warning,
  restore confirmation, progress, success, failure, cancellation) — none of
  it was added in this revision. This remains the largest security-UX gap.
- **Still missing**: destructive-action confirmation for file/contract
  deletion anywhere in the product.
- No cryptographic implementation details are exposed in the new copy
  (`settings_backup_management` correctly avoids naming an algorithm) — good
  adherence to the instruction not to expose crypto implementation details
  in UI copy.
- F1 (stale screenshot) is itself a minor security-communication risk: an
  outdated image claiming server-side password custody, even if
  unintentional, is a misleading security claim sitting in the design
  asset set until corrected.

## J. RTL/Persian validation

Two screens now have Persian/RTL variants: `dashboard_home_persian_rtl` and
`smart_matching_match_analysis_persian_rtl`.

- **Layout mirroring**: correct — navigation order, icon placement, and text
  alignment are properly mirrored right-to-left in both screens.
- **Typography**: Persian text renders with what appears to be an
  appropriate typeface in both screens; no obvious font-fallback/tofu
  issues observed in the static exports.
- **Numerals**: **inconsistent**. `dashboard_home_persian_rtl` mixes Persian
  numerals (e.g. "۳ فوری," "۲ روز") with Western numerals in the same screen
  (match-score badges still read "98%" / "85%" in Western digits, not
  Persian). A professional Persian UI typically commits to one numeral
  system consistently; this mixed presentation is the clearest "does not yet
  feel fully native" issue found.
- **Currency**: prices are shown in US dollars with the Persian word "دلار"
  (dollar) rather than any localized currency — this may be entirely correct
  if the target market genuinely transacts in USD, but it's worth an
  explicit confirmation rather than an assumption either way, since it
  affects more than just UI (it implies a currency/locale product decision
  not previously discussed in any approved document).
- **Translation completeness**: `smart_matching_match_analysis_persian_rtl`
  mirrors the layout to RTL and translates labels/headers to Persian, but
  the "Smart Analysis" narrative paragraph itself is **still in English**
  ("Perfect location and pool, price is slightly above budget but marked as
  Low Priority by the applicant...") inside an otherwise-Persian screen —
  a translation gap, and also means this screen doesn't yet demonstrate a
  fully localized explanation experience even setting the AI-implication
  issue (Blocker 3) aside.
- **Back actions, bottom sheets, forms, timeline, touch targets**: not
  evaluable for RTL specifically, since no RTL variant of
  `authentication_*`, `file_creation_property_entry`,
  `contract_management_timeline`, or any bottom-sheet-based screen was
  provided. Coverage remains too partial (2 of 16 screens) to assess RTL
  correctness product-wide.

## K. Accessibility

No material change from Revision 1's findings beyond the RTL numeral/
translation issues noted in §J. Touch targets, label association, and
color+text status indicators remain consistent with the prior review's
generally positive assessment. Full WCAG certification remains out of scope,
per instruction.

## L. Performance

- The new `settings_backup_management` progress state (45%, "Encrypting
  local database...") is a good, honest example of a loading state used
  appropriately for a genuinely non-instant local operation — consistent
  with the design system's own "skeleton loaders for fast, local operations
  only where warranted" philosophy.
- `matching_ranked_results` is a plain list with no decorative animation
  implied by the static export — consistent with "avoid excessive
  animations that could make local matching feel slow."
- No new performance concerns identified; the large-dataset-behavior gap
  noted in the prior review (small sample lists, not yet stress-tested)
  remains unchanged.

## M. Design-system consistency

- **Border-radius mismatch (Revision 1 finding): NOT resolved.** Both
  `DESIGN.md` (unchanged, same hash as Revision 1) and every checked
  screen's embedded Tailwind config (including newly added screens
  `file_management_owner_detail` and `settings_backup_management`) still
  show the same shifted-by-one-tier radius values identified in the prior
  review. This is confirmed still present, not newly introduced.
- Color, typography, and spacing tokens remain consistent across all 16
  screens, including the newly added ones — no new design-system
  inconsistency introduced by this revision.
- New components introduced: password + confirm-password input pair,
  determinate progress bar with percentage and cancel action, ranked-result
  card with inline matched/mismatched reason rows, reminder-offset toggle
  row with an inline secondary action (Email Alert/Edit Recipients — see
  F3 for why that specific instance is a product-conflict, separate from
  the component pattern itself being reasonable).

## N. Remaining issues (consolidated)

**Blocking:**
1. Blocker 3 (AI implication) — unresolved; the only detail screen delivered
   still uses "Smart Analysis" + sparkle iconography.
2. Blocker 4 (team/brokerage) — partially resolved; navigation-level
   assumptions persist pending the underlying open product decision.
3. F1 — stale `settings_backup_security` screenshot visually contradicts its
   own corrected code; must be regenerated before sign-off.
4. F3 — "Email Alert / Edit Recipients" reintroduces an unapproved,
   network-dependent notification channel.
5. F4 — reminder schedule screen shows only 5 of 7 confirmed default
   offsets with no way to add the missing two.

**Non-blocking, should be addressed:**
6. F2 — "Local Backup... Failed: Network Timeout" residual copy
   inconsistency.
7. F7 — free-form public description field not demonstrated separately from
   internal notes.
8. Missing restore-flow screens (entire workflow, §E/§I).
9. Missing file edit and delete/destructive-confirmation screens (§E).
10. Missing applicant detail/view screen (§E).
11. RTL numeral-system inconsistency and untranslated narrative text (§J).
12. RTL coverage still partial (2 of 16 screens) (§J).
13. Border-radius token mismatch, still unresolved (§M).
14. Currency/locale assumption (USD shown in Persian screen) needs
    confirmation, not assumption (§J).

## O. Implementation readiness

Significant, genuine progress was made this revision: Blockers 1 and 2 are
resolved at the code level, a ranked match-results screen and an owner-detail
screen now exist, backup creation gained a real password-entry and progress
flow, and a reminder-configuration screen was added. But Blocker 3 — the
single most explicit, named instruction in this whole review process ("The
UI must NOT imply that AI is making the matching decision") — is not
resolved, and is arguably more exposed now than before, since it's the only
detail/explanation screen in the current delivery. Combined with a new,
unapproved network-dependent feature (F3) and a stale, misleading screenshot
asset (F1) sitting in the delivered package, this cannot be called ready.

---

## Final gate classification

**NOT READY — BLOCKING ISSUES**

### Blocking issue 1
- **File/path**: `stitch_elite_real_estate_crm/smart_matching_match_analysis_persian_rtl/code.html` and `screen.png`
- **Screen**: Match Analysis / Match Details (Persian RTL) — the only version of this screen in Revision 2
- **Problem**: "تحلیل هوشمند" ("Smart Analysis") panel with an `auto_awesome` sparkle icon and decorative sparkle background, presenting a narrative summary — visually and semantically implies AI-generated analysis
- **Affected requirement**: Phase 0 Decision 3 (matching engine is deterministic, AI-independent) and this review's explicit instruction that the UI must not imply AI is deciding the match
- **Why it blocks**: This is the single most explicit, named constraint given for this review; it was flagged as blocking in Revision 1 and remains unresolved in the only detail screen now delivered
- **Recommended correction**: Remove the sparkle icon and "Smart Analysis" label; present the same underlying content (which is otherwise accurate and rule-based) under plain, transparent framing such as "Why this match scored 94%" with no AI-associated iconography or terminology; also translate the narrative text to Persian to match the rest of the screen

### Blocking issue 2
- **File/path**: `stitch_elite_real_estate_crm/settings_contract_reminders/code.html` and `screen.png`
- **Screen**: Reminder Settings
- **Problem**: A "60 Days Before" reminder row includes "Email Alert Active / Edit Recipients"
- **Affected requirement**: `/docs/01-product-requirements.md` §13 / Phase 0 Decision 4 — reminders use local device notifications, not push/email; no server-mediated notification channel is approved
- **Why it blocks**: Introduces a new, unapproved network dependency into a workflow required to be entirely local
- **Recommended correction**: Remove the Email Alert / Recipients control, or hold it for an explicit product decision before it appears in any implementation-track design

### Blocking issue 3
- **File/path**: `stitch_elite_real_estate_crm/settings_contract_reminders/code.html` and `screen.png`
- **Screen**: Reminder Settings
- **Problem**: Only 90/60/30/14-day and "On Expiration" offsets are shown; the confirmed 7-day and 3-day default offsets are absent, with no control to add them
- **Affected requirement**: `/docs/01-product-requirements.md` §12 (default schedule: 90/60/30/14/7/3/0 days)
- **Why it blocks**: As shown, the screen cannot represent the confirmed default schedule at all, and offers no path to configure the missing offsets
- **Recommended correction**: Add 7-day and 3-day rows (or a general "add offset" control) so the full confirmed default schedule is representable

### Blocking issue 4
- **File/path**: `stitch_elite_real_estate_crm/settings_backup_security/screen.png`
- **Screen**: Backup & Security
- **Problem**: Screenshot asset is byte-identical to the pre-fix Revision 1 image and still visually shows the removed Cloud Sync toggle and AES-256/server-custody claims, even though the corresponding `code.html` was correctly fixed
- **Affected requirement**: Accurate visual representation of the (now-corrected) Phase 0 Decision 4 compliance
- **Why it blocks**: A reviewer or stakeholder relying on the image rather than the code would reasonably conclude the Cloud Sync/encryption blockers are still present — the deliverable is internally inconsistent
- **Recommended correction**: Regenerate the screenshot from the corrected `code.html` before this screen is treated as visually validated

### Blocking issue 5 (navigation-level, affects multiple files)
- **Files/paths**: `stitch_elite_real_estate_crm/settings_backup_security/code.html`, `matching_ranked_results/code.html`, `file_management_owner_detail/code.html`, `file_management_all_files/code.html`, `contract_management_timeline/code.html` (all still show "Global Realty Group" and/or a "Team Directory" nav item)
- **Screens**: App-wide navigation shell/header
- **Problem**: Assumes a team/brokerage/organization account model
- **Affected requirement**: Phase 1 §2/§19.6 Q1 — single-agent vs. team/admin accounts is an explicitly open, unresolved product decision; the working assumption on file is single-agent, no team model
- **Why it blocks**: Implementing this navigation as shown would implement an unapproved data/authorization model (team-shared data) by default
- **Recommended correction**: Either obtain an explicit product decision confirming team/brokerage accounts are in scope for v1 (and update the requirements/data-model docs accordingly before implementation), or remove "Global Realty Group" and "Team Directory" from the navigation shell to match the confirmed single-agent model

No blocking issues are resolved silently in this document; none of the above
have been fixed. This report is for the product owner's review before any
implementation proceeds.
