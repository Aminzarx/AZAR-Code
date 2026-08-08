# UI Screen Mapping — Stitch Design Package → React Native

Status: PROPOSED — the binding contract between the approved 44-screen
Stitch design package and Phase 12's actual implementation. This document
does not redesign anything; every visual and content decision below
already exists in `/design/stitch/stitch_elite_real_estate_crm/` and
`/docs/ui/design-system.md`. What this document adds is the
implementation mapping those sources don't specify: which RN screen file
each one becomes, which navigation route it lives at, what state it reads
from, and how its loading/empty/error/success variants are meant to
work.
Date: 2026-08-08

## How to read this document

Each row is one Stitch screen folder. "RN Screen" is the proposed
component/file name (not yet created — this is a plan). "Route" is its
place in the navigation tree. "Data source" names which Phase 6-10 module
the screen reads from or writes to. The four state columns
(Loading/Empty/Error/Success) describe what that screen needs to handle
beyond its "happy path" static mockup — a screen with "—" in a column
genuinely doesn't need that state (e.g. a confirmation screen has no
"empty" state), not that the state was overlooked.

RTL counterparts are listed as their own rows, immediately following
their LTR counterpart, since they typically share almost everything except
layout direction and copy — where that's true, the RTL row says so instead
of repeating the full mapping.

---

## Authentication (3 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `authentication_phone_entry` | `PhoneEntryScreen` | `Auth/PhoneEntry` | Phase 8 auth module | Spinner on submit button while OTP send request is in flight | — | Invalid format (client-side) vs. no-connectivity (AUTH-06, visually distinct per Phase 2) vs. server-rejected number | Navigates to OTP verification |
| `authentication_otp_verification` | `OtpVerificationScreen` | `Auth/OtpVerification` | Phase 8 auth module | Spinner while verifying | — | Wrong code (with attempts-remaining count), expired code (distinct message), no-connectivity | Navigates to referral code entry |
| `authentication_referral_code` | `ReferralCodeScreen` | `Auth/ReferralCode` | Phase 8 auth module | Spinner while validating | — | Invalid/nonexistent code, self-referral rejected, no-connectivity (REF-06) | Registration completes; navigates to Dashboard, local session established |

## Dashboard (2 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `dashboard_home` | `DashboardScreen` | `Dashboard` (tab root) | Phase 6 repositories (file counts, upcoming reminders), Phase 10 reminders | Skeleton for summary cards on first load | First-run state with no files/contracts yet — not in the current Stitch set; must be designed per Phase 12's "no redesign unless a documented defect" rule, flagged here as a genuine gap (§"Gaps found" below) | Local read failure (rare — surfaced generically, not a designed state in the source screens) | Normal populated view |
| `dashboard_home_persian_rtl` | Same component, `I18nManager.isRTL`-driven | Same route | Same | Same | Same gap applies | Same | Same |

## File management (9 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `file_management_all_files` | `AllFilesScreen` | `Files/All` | Phase 6 `OwnerFileRepository`/`ApplicantFileRepository`, paginated | Skeleton list rows while first page loads | **Design gap** — flagged in `design-system-audit.md`'s cross-cutting findings as not yet demonstrated; Phase 12 must design a plain, on-brand empty state (§8.19 pattern: icon + heading + supporting text + primary action) rather than inventing one ad hoc | Query/read failure | Populated, paginated list with search/filter |
| `file_creation_property_entry` | `PropertyEntryScreen` (bottom sheet) | Modal route over `Files/All` | Phase 6 `OwnerFileRepository.create()` | Spinner on save | — | Field-level validation errors (§16 pattern), save failure | Sheet closes, list refreshes |
| `file_management_owner_detail` | `OwnerDetailScreen` | `Files/Owner/:id` | Phase 6 `OwnerFileRepository.findById()` | Skeleton while loading | N/A (file must exist to navigate here) | Not-found (deleted elsewhere/race), read failure | Populated detail view |
| `file_management_owner_edit` | `OwnerEditScreen` (bottom sheet) | Modal route over Owner Detail | Phase 6 `OwnerFileRepository.update()` | Spinner on save | — | Field validation, unsaved-changes-on-close warning (§8.13), save failure | Sheet closes, detail view refreshes |
| `file_management_owner_edit_persian_rtl` | Same component | Same route | Same | Same | Same | Same | Same |
| `file_management_applicant_detail` | `ApplicantDetailScreen` | `Files/Applicant/:id` | Phase 6 `ApplicantFileRepository.findById()`, Phase 9 (priority chip display) | Skeleton | N/A | Not-found, read failure | Populated detail view |
| `file_management_applicant_detail_persian_rtl` | Same component | Same route | Same | Same | Same | Same | Same |
| `file_management_applicant_edit` | `ApplicantEditScreen` (bottom sheet) | Modal route over Applicant Detail | Phase 6 `ApplicantFileRepository.update()` | Spinner on save | — | Field validation, unsaved-changes warning, save failure | Sheet closes, detail refreshes |
| `applicant_smart_requirements` *(folder name retained; UI copy corrected to "Applicant Requirements" — see `content-style-guide.md`)* | `ApplicantRequirementsScreen` | `Files/Applicant/:id/Requirements` | Phase 6 `RequirementCriterionRepository`, Phase 9 (priority model) | Skeleton while loading existing criteria | An applicant with zero criteria defined yet — needs the same empty-state pattern flagged for `AllFilesScreen` | Save failure, conflicting-range validation error (per `matching-scoring-spec.md`'s "conflicting value" rule — caught here, at entry) | Criteria saved; conditional-suppression relationships (§9 of Phase 4B) editable here |

## Matching (2 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `matching_ranked_results` | `MatchResultsScreen` | `Matching/Results/:applicantId` | Phase 9 matching engine + Phase 6 repositories | Spinner/skeleton while the match computation runs | **Design gap** — no zero-results state currently designed (flagged in `design-system-audit.md`); Phase 12 must add one following §8.19 | Computation failure (should be rare — a bug, not a user-facing expected state, but still needs a generic fallback) | Ranked list with score + matched/mismatched/ignored summary |
| `smart_matching_match_analysis_persian_rtl` *(folder name retained; content corrected to remove "Smart Analysis" framing)* | `MatchExplanationScreen` | `Matching/Explanation/:matchId` | Phase 9's `MatchExplanation` output | Skeleton | N/A (a specific match always has an explanation, per the data model's Match↔MatchExplanation invariant) | Read failure | Full explanation: matched/partial/mismatched/ignored/conditionally-suppressed/critical-satisfied sections, per `matching-scoring-spec.md` |

## Contracts (1 screen)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `contract_management_timeline` | `ContractTimelineScreen` | `Contracts` (tab root) | Phase 6 `ContractRepository`, Phase 10 expiration/urgency calculation | Skeleton | **Design gap** — no empty state currently designed; needed for an agent with zero contracts | Read failure | Urgency-tiered timeline (`warning` token for approaching expiration, per the UI correction pass); still-open content gap: no "Expired" bucket yet designed, tracked separately as a product/content item, not a Phase 12 implementation task |

## Settings (5 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `settings_contract_reminders` | `ReminderSettingsScreen` | `Settings/Reminders` | Phase 10 `ReminderSchedule` repository | Skeleton | N/A (always shows the seven default/current offsets) | Save failure | Offset toggled on/off, persisted |
| `settings_contract_reminders_persian_rtl` | Same component | Same route | Same | Same | Same | Same | Same — Phase 12 should also resolve the LTR/RTL chrome-consistency deviation flagged in `design-system-audit.md` (RTL version currently shows full app-shell nav where LTR shows a minimal "deep settings" chrome) while implementing, since it's a documented, still-open Category B item, not a new decision |
| `settings_backup_management` | `BackupManagementScreen` | `Settings/Backup` | Phase 7 backup module | Spinner during backup creation (determinate progress, per §8.17) | N/A | Creation failure (storage, encryption failure) | Backup created, listed in history |
| `settings_backup_security` | `BackupSecurityScreen` | `Settings/Backup/Security` | Phase 7 backup module (status/metadata only — never displays key material) | — | — | — | Informational; displays encryption status truthfully (no AES-256 marketing claim, per the prior correction pass) |
| *(Restore entry point)* `restore_select_backup` | `SelectBackupScreen` | `Settings/Backup/Restore/SelectFile` | Platform file picker + Phase 7 backup module (format recognition, step 1 of validation) | Spinner while validating selected file's format | No backups found via picker (device-dependent; file-picker-native empty state, not a custom one) | Not-a-backup-file error | Proceeds to password entry |
| `restore_password_entry` | `RestorePasswordScreen` | `Settings/Backup/Restore/Password` | Phase 7 backup module (steps 2-3 of validation: header parse, DEK-unwrap auth check) | Spinner while deriving key (Argon2id — must not block UI thread, per Phase 7) | — | Wrong password (with attempt count), distinct from corruption | Proceeds to next validation step / existing-data check |
| `restore_corrupted_backup` | `CorruptedBackupScreen` | `Settings/Backup/Restore/Corrupted` (terminal) | Phase 7 backup module (step 4 failure: payload auth check) | — | — | (this screen *is* the error state) | "Choose another file" returns to `SelectBackupScreen` |
| `restore_incompatible_version` | `IncompatibleVersionScreen` | `Settings/Backup/Restore/Incompatible` (terminal) | Phase 7 backup module (step 5: schema/format version check vs. the CURRENT+2 window) | — | — | (this screen *is* the error state) | "Choose another file" returns to `SelectBackupScreen` |

## Restore safety-backup flow (10 states, 6 with RTL — 16 screens)

This is the highest-security-relevance mapping in this document — every
row corresponds directly to a state in `04-final-architecture.md` §7's
restore state machine, and Phase 12's wiring must preserve that
correspondence exactly, per that phase's own stated risk.

| # | Screen | RN Screen | Route | State-machine state | Data source |
|---|---|---|---|---|---|
| 1 | `restore_existing_data_detected` | `ExistingDataDetectedScreen` | `Restore/ExistingData` | `EXISTING_DATA_DETECTED` | Phase 6 repositories (record counts for the summary text) |
| 1 (RTL) | `restore_existing_data_detected_persian_rtl` | Same component | Same route | Same | Same |
| 2 | `restore_safety_backup_required` | `SafetyBackupRequiredScreen` | `Restore/SafetyBackupRequired` | Transition into `CREATING_SAFETY_BACKUP` | Phase 7 backup module |
| 2 (RTL) | `restore_safety_backup_required_persian_rtl` | Same component | Same route | Same | Same |
| 3 | `restore_safety_backup_progress` | `SafetyBackupProgressScreen` | `Restore/SafetyBackupProgress` | `CREATING_SAFETY_BACKUP` (determinate progress) | Phase 7 backup module |
| 3 (RTL) | `restore_safety_backup_progress_persian_rtl` | Same component | Same route | Same | Same |
| 4 | `restore_safety_backup_success` | `SafetyBackupSuccessScreen` | `Restore/SafetyBackupSuccess` | `SAFETY_BACKUP_VERIFIED` | Phase 7 backup module (names the created file) |
| 4 (RTL) | `restore_safety_backup_success_persian_rtl` | Same component | Same route | Same | Same |
| 5 | `restore_safety_backup_failure` | `SafetyBackupFailureScreen` | `Restore/SafetyBackupFailure` (terminal unless retried) | `SAFETY_BACKUP_FAILED` — **no forward transition exists from here**, per the hard invariant | Phase 7 backup module |
| 5 (RTL) | `restore_safety_backup_failure_persian_rtl` | Same component | Same route | Same | Same |
| 6 | `restore_existing_data_warning` *(repurposed as the Restore & Replace Confirmation)* | `RestoreConfirmationScreen` | `Restore/Confirm` | `REPLACE_CONFIRMATION_REQUIRED` | Phase 7 backup module (names both the incoming and safety-backup files) |
| 6 (RTL) | `restore_existing_data_warning_persian_rtl` | Same component | Same route | Same | Same |
| 7 | `restore_progress` | `RestoreProgressScreen` | `Restore/Progress` | `RESTORING` → `ATOMIC_SWAP` (UI shows one continuous progress state spanning both, since the swap itself is near-instantaneous) | Phase 7 backup module |
| 8 | `restore_success` | `RestoreSuccessScreen` | `Restore/Success` (terminal) | `RESTORE_SUCCESS`, after `VALIDATING_RESTORED_DATA` passes | Phase 6 repositories (post-restore record counts) |
| 9 | `restore_failure` | `RestoreFailureScreen` | `Restore/Failure` (terminal unless retried) | `RESTORE_FAILED` (from either the `RESTORING` or `VALIDATING_RESTORED_DATA` state) | Phase 7 backup module |
| 10 | `restore_cancelled` | `RestoreCancelledScreen` | `Restore/Cancelled` (terminal) | `CANCELLED` — reachable from every pre-`RESTORING` state | None (confirms nothing changed) |
| 10 (RTL) | `restore_cancelled_persian_rtl` | Same component | Same route | Same | Same |

Loading/Empty/Error/Success for this group are implicit in the
state-machine mapping itself: each screen *is* one state, its "loading"
variant is the state it transitions through to reach the next screen (not
a separate variant within the same screen), and "error" states are their
own dedicated screens (rows 5 and 9) rather than an error variant of a
success screen — this matches the design system's explicit decision not
to silently combine restore-flow states (`design-system.md` §8.22).

## Destructive confirmation (2 screens)

| Screen | RN Screen | Route | Data source | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|
| `ui_destructive_confirmation` | `DestructiveConfirmationSheet` | Reusable modal, parameterized by the calling screen (e.g. file deletion) | Whichever repository method performs the deletion | Spinner on the commit button while the delete executes | — | Delete failure (rare — storage/constraint issue) | Sheet closes, calling screen's list refreshes |
| `ui_destructive_confirmation_persian_rtl` | Same component | Same | Same | Same | — | Same | Same |

---

## Design gaps found during this mapping (not resolved here)

Per this phase's control rule — stop, document, don't invent — the
following are genuine gaps between the 44 designed screens and what a
complete implementation needs, carried forward as flagged items rather
than silently designed during this mapping pass:

1. **No empty-state design exists yet** for `AllFilesScreen`,
   `MatchResultsScreen` (zero results), `ContractTimelineScreen`, or a
   true first-run `DashboardScreen` (an agent with no files/contracts at
   all) — already flagged as a cross-cutting Category D finding in
   `design-system-audit.md`, restated here because Phase 12 cannot
   actually ship these four screens without one. This needs a short,
   focused design pass (following the already-documented §8.19 pattern:
   icon + heading + supporting text + primary action) before or during
   Phase 12, not a Phase-12-improvised one-off per screen.
2. **The RTL/LTR chrome inconsistency on `settings_contract_reminders`**
   (already tracked as Category B) should be resolved as part of
   implementing that screen, per the note in its table row above.
3. **No loading/skeleton pattern has been visually designed** — the
   `design-system.md` component set doesn't yet specify what a skeleton
   list row or skeleton card looks like; Phase 11 (UI Foundation) should
   propose one consistent with the existing soft-flat, minimal visual
   language, since nearly every screen in this mapping needs one.

None of these block starting Phase 12 on the screens that don't have this
gap — they should be resolved as a small, targeted design addition
(ideally before Phase 12 reaches the affected screens), not treated as a
reason to delay the whole phase.
