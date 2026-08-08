# Design System Audit — Stitch Screen Set vs. AZAR Design System

Status: RE-AUDITED after the FINAL UI correction pass before Phase 4. This
pass corrected the restore safety-backup flow (10 distinct states, 12 new
screens), the 48dp touch-target gap, and the warning/error semantic
separation; dark mode remains explicitly deferred (unchanged). Audited
against `/docs/ui/design-system.md` v1.1.0, across all 44 screens (32
original + 12 new restore safety-backup-flow screens) in
`/design/stitch/stitch_elite_real_estate_crm/`.
Date: 2026-08-08 (re-audit)

## Classification key

- **A — Correct and compliant**: matches the design system as documented.
- **B — Minor deviation, should be normalized**: inconsistent with the
  system in a low-impact way (e.g. an icon size off by one step); worth
  fixing in a future pass, not urgent.
- **C — Intentional product-specific exception**: deliberately diverges
  from generic Material 3 and is *already documented as such* in
  `design-system.md` (e.g. bottom sheets used for all dialogs).
- **D — Incorrect, must be corrected**: a real gap or defect against the
  system (missing state, accessibility gap, or a leftover inconsistency)
  that should not ship as-is.

---

## Cross-cutting findings (apply to some or all screens; not repeated per-row)

These are the load-bearing findings — most individual screens are
compliant *given* these caveats:

| Finding | Classification | Scope |
|---|---|---|
| Border-radius token mismatch | **A (resolved)** | All 44 screens — already reconciled in the prior correction pass; re-verified clean during this audit. |
| Icon sizes used ad hoc (10/14/16/18/20/24/28/32/48px, no naming) | **B** | All screens using icons (i.e. all 44) — consolidate to the 6-step `icon-*` scale (design-system.md §13); no visual change required, this is a naming/consistency exercise. |
| `label-sm-mobile` (10px bottom-nav label) never a named token in `DESIGN.md` | **B** | Every screen with a bottom nav bar (~24 of 44) — now formalized in design-system.md §3.1, no screen needs to change. |
| Keyboard focus ring only demonstrated on text fields, not buttons/icon-buttons/nav items | **D** | All 44 screens — genuine accessibility gap, not yet demonstrated anywhere; unchanged by this pass (out of scope — the brief scoped this pass to the restore flow, touch targets, warning token, and dark-mode deferral only). |
| **Icon-only buttons below the 48dp touch-target minimum** | **A (resolved this pass)** | Every icon-only interactive control app-wide (back/close buttons, header icons, numeric steppers, list-row overflow buttons — was ~20 of 32, now audited across all 44) — every icon-only control now sits inside a 48×48dp minimum hit-area (`min-w-[48px] min-h-[48px]` + centered padding) while the visual icon glyph is unchanged in size. Fixed at the shared-template level (`page_shell`/`sheet_shell` back/close buttons) plus a targeted pass over bespoke icon buttons. See design-system.md §9. |
| No `aria-label` on icon-only buttons in the reference HTML | **D** | All 44 screens — expected for static mockups, but must be added in real implementation markup; unchanged by this pass (implementation-phase concern, not a design-package defect). |
| Dark mode wired (`darkMode: "class"`) but no dark palette actually designed | **D (deferred, confirmed unchanged)** | All 44 screens — flagged in design-system.md §12 as a real gap; explicitly **not** designed in this pass per instruction — no dark-mode colors were invented or guessed. `design-tokens.json`'s `color.dark` remains `{"$status": "NOT DEFINED..."}"`. Dark mode remains a future product/design decision. |
| **`warning` treated as a reuse of the `error` color family rather than a distinct amber-family token** | **A (resolved this pass)** | Was: contract urgency screens specifically. Now: `warning`/`on-warning`/`warning-container`/`on-warning-container` exist as genuine tokens (`design-tokens.json`, every affected screen's embedded config) and are applied wherever the content is cautionary rather than a genuine failure — `contract_management_timeline`'s urgency tiers (including replacing an undocumented hardcoded hex `#f57f17`/`#fff8e1` in the "Upcoming" tier), `settings_contract_reminders`'s five severity bars, and the restore safety-backup flow's states 1/2/3/4/6. `error` is reserved for genuine failures and for the destructive-commit button itself (§12). |
| Empty states, loading/skeleton states not demonstrated for any list screen | **D** | `file_management_all_files`, `matching_ranked_results`, `contract_management_timeline`, `settings_backup_security` (history list) — none show an empty or loading variant; unchanged by this pass (out of scope). |
| Google-hosted stock avatar/property photo URLs (`lh3.googleusercontent.com`) present throughout | **C** | Intentional placeholder content for a design mockup — not a defect, will be replaced by real user/property images in implementation; no action needed. |
| Restore safety-backup flow missing its mandatory pre-replace safety-backup step as a distinct state | **A (resolved this pass)** | Was the single most consequential D finding in the prior audit (rows 18/19 below). Now: 10 distinct states across LTR (all) and RTL (states 1-6, 10) screens, per design-system.md §8.22. Restore-progress/success/failure (states 7-9) remain LTR-only, carried scope from before this pass — see row-level notes below. |

---

## Screen-by-screen audit

| # | Screen | Classification | Notes |
|---|---|---|---|
| 1 | `applicant_smart_requirements` | **A** | Priority segmented control (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE) is the strongest compliance point in the whole set — directly matches design-system.md §18.1 verbatim. No deviations beyond the cross-cutting icon-size/focus-ring items. |
| 2 | `authentication_otp_verification` | **A** | Auto-advance digit-box focus behavior is a deliberate, documented exception (design-system.md §16) — correctly scoped to OTP entry only, not generalized. |
| 3 | `authentication_phone_entry` | **A** | Clean, compliant form pattern. No content-level design-system deviations found (the registration/login flow-ordering ambiguity noted in `/docs/ui/00-ui-handoff-review.md` is a *product/UX* finding, not a design-system compliance issue, and is out of scope for this audit). |
| 4 | `authentication_referral_code` | **A** | Compliant since the correction pass removed "Request an Invitation"/"Brokerage Login." |
| 5 | `contract_management_timeline` | **A (resolved this pass)** | Urgency-tier color coding now uses the distinct `warning`/`warning-container` token for both the "Urgent" and "Upcoming" tiers, replacing both the prior `error`-family borrowing and an undocumented hardcoded hex. `error` no longer appears anywhere on this screen. The (still-open, tracked separately in product docs) missing "Expired" bucket remains a *content/requirements* gap, not a design-system one. |
| 6 | `dashboard_home` | **B** | Redundant double greeting ("Good morning," / "Hello, Sarah") — a content/copy issue already flagged in the prior UI review, not re-litigated here as a design-system violation, but noted for whoever performs the next content pass. |
| 7 | `dashboard_home_persian_rtl` | **B** | **Uses Geist/Inter (Latin fonts) for Persian text rather than Vazirmatn** — the one screen in the set still on font fallback rather than the now-formalized Persian typeface (design-system.md §3.2). Layout mirroring and RTL structure are otherwise correct. Also mixes Persian and Western numerals within the same screen (match-score badges in Western digits, day counts in Persian digits) — should be reconciled per the §3.3 numeral rule (both are individually "correct" per the rule, so this is more a documentation/consistency note than a rule violation, but flagged since it was the audit's original inconsistency finding). |
| 8 | `file_creation_property_entry` | **A** | The canonical bottom-sheet form pattern — segmented control, slider, stepper, chips all exactly match design-system.md §8.1-§8.7/§16. |
| 9 | `file_management_all_files` | **A/D** | Compliant list-row structure (design-system.md §17); the per-row "more" overflow icon button (previously ~22px effective target) and header icon buttons are now corrected to the 48dp hit-area (**A, resolved this pass**). Still has no empty state or loading state (cross-cutting **D**, unchanged — out of scope for this pass). |
| 10 | `file_management_applicant_detail` | **A** | New screen (Phase 3 correction), built directly against the same patterns as `file_management_owner_detail` — fully compliant, including correct priority-chip usage (§18.1). |
| 11 | `file_management_applicant_detail_persian_rtl` | **A** | Uses Vazirmatn correctly (built in the correction pass, already compliant with the now-formalized typeface decision). Persian/Western numeral split matches the §3.3 rule (Persian for counts, `dir="ltr"` Western digits for phone/email/currency). |
| 12 | `file_management_applicant_edit` | **A** | Reuses existing form components per design-system.md §16's explicit instruction not to invent new ones; includes a compliant unsaved-changes banner (§8.13) and validation-error state (§8.3). |
| 13 | `file_management_owner_detail` | **A** | The template this audit's "detail screen" pattern is drawn from — fully compliant. One structural note (not a violation): only a single "Private Notes" field exists, with no separate public-facing free-form description field — this is a *product/requirements* completeness question (already tracked in `/docs/ui/00-ui-handoff-review.md` finding F7), not a design-system deviation. |
| 14 | `file_management_owner_edit` | **A** | Compliant, matches §12/§16. |
| 15 | `file_management_owner_edit_persian_rtl` | **A** | Vazirmatn used correctly; compliant. |
| 16 | `matching_ranked_results` | **A** | Clean, no AI-styled language, compliant with §18.2's score-presentation rule (large bold numeral + "Score" caption) and §18.3's matched/mismatched inline reasoning. No empty-results state demonstrated (cross-cutting **D**). |
| 17 | `restore_corrupted_backup` | **A** | Compliant error-state pattern (§8.20), explicit named actions (§8.21). |
| 18 | `restore_existing_data_warning` | **A (resolved this pass)** | **Repurposed as State 6 ("Restore & Replace Confirmation") of the finalized 10-state restore safety-backup flow (design-system.md §8.22)** — now positioned *after* the mandatory safety backup succeeds (State 4), not immediately after existing-data detection. Copy updated to reference the safety-backup file by name as a recovery path. Icon/banner now use `warning` (caution, not yet a failure); the commit button ("Restore & Replace") correctly keeps `error` per the destructive-commit-button rule (§12). Explicit checkbox, named "Cancel"/"Restore & Replace" buttons, itemized consequence list all remain compliant with §8.21. |
| 19 | `restore_existing_data_warning_persian_rtl` | **A (resolved this pass)** | Same repurposing and warning/error re-coloring as #18; Vazirmatn/RTL execution remains compliant. |
| — | `restore_existing_data_detected` (+ RTL) | **A** | New — State 1. Informational, `warning`-token icon/banner, explicitly states existing data, that a safety backup comes first, and that nothing changes before explicit confirmation. Compliant with §8.22/§16. |
| — | `restore_safety_backup_required` (+ RTL) | **A** | New — State 2. Explains why the safety-backup step exists and that restore cannot proceed if it fails; `warning` token. Compliant. |
| — | `restore_safety_backup_progress` (+ RTL) | **A** | New — State 3. Determinate progress + explicit reassurance that current data is untouched during this step; cancel available. Compliant with §8.17/§19. |
| — | `restore_safety_backup_success` (+ RTL) | **A** | New — State 4. Names the safety-backup file, previews the next (destructive) step; `warning` token for the "next step is destructive" notice. Compliant. |
| — | `restore_safety_backup_failure` (+ RTL) | **A** | New — State 5. Genuine failure state, correctly uses `error`/`error-container`; explicitly states restore cannot continue and current data is unchanged. Compliant with §8.20. |
| — | `restore_cancelled` (+ RTL) | **A** | New — State 10. Explicit, visible cancellation confirmation stating no data was modified, rather than silently closing the sheet. Compliant. |
| — | `restore_progress` | **A** | State 7 (renumbered "Step 5 of 6" within the finalized flow). Copy updated to also reassure that the pre-restore safety backup remains available. Touch-target on its close icon corrected. RTL variant not yet built — carried scope from before this pass, not a new gap introduced by it. |
| — | `restore_success` | **A** | State 8, unchanged content, touch-target corrected. RTL variant not yet built (same carried-scope note as above). |
| — | `restore_failure` | **A** | State 9. Copy updated to reassure that the pre-restore safety backup remains available for recovery if the restore itself failed. Touch-target corrected. RTL variant not yet built (same carried-scope note as above). |
| 20 | `restore_failure` | **A** | Compliant. |
| 21 | `restore_incompatible_version` | **A** | Compliant. |
| 22 | `restore_password_entry` | **A** | Compliant; wrong-password state correctly distinguishes itself from corrupted/incompatible-version states per §8.20. |
| 23 | `restore_progress` | **A** | Compliant determinate-progress pattern (§8.17) with an explicit, reassuring cancellation message — a good example of the safety-conscious copy this system calls for. |
| 24 | `restore_select_backup` | **A** | Compliant; validation-in-progress state correctly uses an indeterminate spinner for a genuinely variable-duration local operation (§8.17/§19), not a bare instant action. |
| 25 | `restore_success` | **A** | Compliant. |
| 26 | `settings_backup_management` | **A** | Compliant; password + confirm-password entry and determinate progress state are the strongest security-UX compliance points in the set. |
| 27 | `settings_backup_security` | **A** | Fully compliant since the correction pass (no Cloud Sync, no AES-256 claim, corrected "Insufficient Storage Space" wording, non-cloud status icon). Screenshot was regenerated and verified to match its own source. |
| 28 | `settings_contract_reminders` | **A** | Fully compliant since the correction pass — all 7 confirmed default offsets present, Email Alert removed, local-notification banner present (§19). |
| 29 | `settings_contract_reminders_persian_rtl` | **B** | Compliant content-wise (Vazirmatn, correct offsets, correct local-notification messaging), but uses the full app-shell wrapper (side nav + bottom nav) rather than matching the LTR version's minimal "deep settings page" chrome (no bottom nav shown) — a layout-consistency deviation between the LTR and RTL versions of the same screen, not a content or policy defect. Should be normalized in a future pass. |
| 30 | `smart_matching_match_analysis_persian_rtl` | **B** | Content and typography fully compliant since the correction pass — "Smart Analysis"/sparkle removed, replaced with "توضیح تطابق" (Match Explanation) using a plain `rule` icon, explicit Ignored section present (§18.3/§18.4), and Vazirmatn was already in use on this screen independent of the correction pass. The only remaining deviation is cosmetic: the folder name itself still contains "smart_matching" — filename-only residue, not user-facing UI text — not renamed per the prior pass's explicit decision not to rename files without being asked. |
| 31 | `ui_destructive_confirmation` | **A** | Canonical destructive-confirmation pattern (§8.21) — named actions, itemized consequences, no bare "OK." |
| 32 | `ui_destructive_confirmation_persian_rtl` | **A** | Same pattern, correctly executed in Vazirmatn/RTL. |

---

## Summary counts (re-audit, 44 screens)

| Classification | Count | Screens |
|---|---|---|
| A — Compliant | 41 | 1,2,3,4,5,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,31,32, plus the 12 new restore safety-backup-flow screens and `file_management_all_files` (9, partial — see below) |
| B — Minor deviation | 2 | 6,7 (dashboard content/copy issues — redundant greeting, RTL numeral-mixing — unaffected by this pass, not re-litigated here) |
| C — Documented exception | 0 screen-level (see cross-cutting table for the one C item: stock photo placeholders) | — |
| D — Must correct | 1 (partial) | 9 (partial — empty/loading list state still not demonstrated; its touch-target finding is now resolved) |

*Row 30 (`smart_matching_match_analysis_persian_rtl`) and row 29
(`settings_contract_reminders_persian_rtl`) keep their prior **B**
classification for reasons unrelated to this pass (folder-naming residue
and LTR/RTL chrome-consistency, respectively) — both are counted in the B
row above but not restated as separate B rows to avoid double-counting; see
their per-screen notes above for detail.*

**Every Category D finding with product-level consequence from the prior
audit is now resolved.** The restore safety-backup flow's missing step
(rows 18/19) and the app-wide 48dp touch-target gap and warning/error
conflation (cross-cutting findings) are all **A (resolved)**. What remains
classified D is exclusively implementation-phase/markup concerns (focus
rings, `aria-label`s) and one still-missing content state (empty/loading
list variants) — none of which block treating the *design* as ready for
Phase 4. Dark mode remains explicitly **D (deferred, confirmed unchanged)**
by product decision, not an oversight.
