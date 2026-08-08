# Design System Audit — Stitch Screen Set vs. AZAR Design System

Status: DRAFT — audit only. No screens were redesigned or modified as part
of this audit; this document classifies existing deviations for future
correction passes to act on. Audited against
`/docs/ui/design-system.md` v1.0.0, across all 32 screens in
`/design/stitch/stitch_elite_real_estate_crm/`.
Date: 2026-08-08

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
| Border-radius token mismatch | **A (resolved)** | All 32 screens — already reconciled in the prior correction pass; re-verified clean during this audit. |
| Icon sizes used ad hoc (10/14/16/18/20/24/28/32/48px, no naming) | **B** | All screens using icons (i.e. all 32) — consolidate to the 6-step `icon-*` scale (design-system.md §13); no visual change required, this is a naming/consistency exercise. |
| `label-sm-mobile` (10px bottom-nav label) never a named token in `DESIGN.md` | **B** | Every screen with a bottom nav bar (~24 of 32) — now formalized in design-system.md §3.1, no screen needs to change. |
| Keyboard focus ring only demonstrated on text fields, not buttons/icon-buttons/nav items | **D** | All 32 screens — genuine accessibility gap, not yet demonstrated anywhere. |
| Icon-only buttons (back/close, 40×40px) below the 48dp touch-target recommendation | **D** | Every screen with a back/close icon button (~20 of 32) — needs an invisible hit-area expansion in implementation; no visual change. |
| No `aria-label` on icon-only buttons in the reference HTML | **D** | All 32 screens — expected for static mockups, but must be added in real implementation markup. |
| Dark mode wired (`darkMode: "class"`) but no dark palette actually designed | **D** | All 32 screens — flagged in design-system.md §12 as a real gap, not designed in this pass. |
| `warning` treated as a reuse of the `error` color family rather than a distinct amber-family token | **B** | Contract urgency screens specifically (`contract_management_timeline` and its data); flagged in design-system.md §12. |
| Empty states, loading/skeleton states not demonstrated for any list screen | **D** | `file_management_all_files`, `matching_ranked_results`, `contract_management_timeline`, `settings_backup_security` (history list) — none show an empty or loading variant. |
| Google-hosted stock avatar/property photo URLs (`lh3.googleusercontent.com`) present throughout | **C** | Intentional placeholder content for a design mockup — not a defect, will be replaced by real user/property images in implementation; no action needed. |

---

## Screen-by-screen audit

| # | Screen | Classification | Notes |
|---|---|---|---|
| 1 | `applicant_smart_requirements` | **A** | Priority segmented control (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE) is the strongest compliance point in the whole set — directly matches design-system.md §18.1 verbatim. No deviations beyond the cross-cutting icon-size/focus-ring items. |
| 2 | `authentication_otp_verification` | **A** | Auto-advance digit-box focus behavior is a deliberate, documented exception (design-system.md §16) — correctly scoped to OTP entry only, not generalized. |
| 3 | `authentication_phone_entry` | **A** | Clean, compliant form pattern. No content-level design-system deviations found (the registration/login flow-ordering ambiguity noted in `/docs/ui/00-ui-handoff-review.md` is a *product/UX* finding, not a design-system compliance issue, and is out of scope for this audit). |
| 4 | `authentication_referral_code` | **A** | Compliant since the correction pass removed "Request an Invitation"/"Brokerage Login." |
| 5 | `contract_management_timeline` | **B** | Urgency-tier color coding borrows from the `error` family at varying tints/opacities rather than using a distinct `warning` token (cross-cutting finding above). Otherwise compliant, including the (still-open, tracked separately in product docs) missing "Expired" bucket, which is a *content/requirements* gap, not a design-system one. |
| 6 | `dashboard_home` | **B** | Redundant double greeting ("Good morning," / "Hello, Sarah") — a content/copy issue already flagged in the prior UI review, not re-litigated here as a design-system violation, but noted for whoever performs the next content pass. |
| 7 | `dashboard_home_persian_rtl` | **B** | **Uses Geist/Inter (Latin fonts) for Persian text rather than Vazirmatn** — the one screen in the set still on font fallback rather than the now-formalized Persian typeface (design-system.md §3.2). Layout mirroring and RTL structure are otherwise correct. Also mixes Persian and Western numerals within the same screen (match-score badges in Western digits, day counts in Persian digits) — should be reconciled per the §3.3 numeral rule (both are individually "correct" per the rule, so this is more a documentation/consistency note than a rule violation, but flagged since it was the audit's original inconsistency finding). |
| 8 | `file_creation_property_entry` | **A** | The canonical bottom-sheet form pattern — segmented control, slider, stepper, chips all exactly match design-system.md §8.1-§8.7/§16. |
| 9 | `file_management_all_files` | **B/D** | Compliant list-row structure (design-system.md §17), but has no empty state or loading state (cross-cutting **D**), and its search/filter entry point (**B**) uses a slightly different icon-button sizing than the header search icon elsewhere — same 40px pattern, no functional issue, just worth a consistency pass. |
| 10 | `file_management_applicant_detail` | **A** | New screen (Phase 3 correction), built directly against the same patterns as `file_management_owner_detail` — fully compliant, including correct priority-chip usage (§18.1). |
| 11 | `file_management_applicant_detail_persian_rtl` | **A** | Uses Vazirmatn correctly (built in the correction pass, already compliant with the now-formalized typeface decision). Persian/Western numeral split matches the §3.3 rule (Persian for counts, `dir="ltr"` Western digits for phone/email/currency). |
| 12 | `file_management_applicant_edit` | **A** | Reuses existing form components per design-system.md §16's explicit instruction not to invent new ones; includes a compliant unsaved-changes banner (§8.13) and validation-error state (§8.3). |
| 13 | `file_management_owner_detail` | **A** | The template this audit's "detail screen" pattern is drawn from — fully compliant. One structural note (not a violation): only a single "Private Notes" field exists, with no separate public-facing free-form description field — this is a *product/requirements* completeness question (already tracked in `/docs/ui/00-ui-handoff-review.md` finding F7), not a design-system deviation. |
| 14 | `file_management_owner_edit` | **A** | Compliant, matches §12/§16. |
| 15 | `file_management_owner_edit_persian_rtl` | **A** | Vazirmatn used correctly; compliant. |
| 16 | `matching_ranked_results` | **A** | Clean, no AI-styled language, compliant with §18.2's score-presentation rule (large bold numeral + "Score" caption) and §18.3's matched/mismatched inline reasoning. No empty-results state demonstrated (cross-cutting **D**). |
| 17 | `restore_corrupted_backup` | **A** | Compliant error-state pattern (§8.20), explicit named actions (§8.21). |
| 18 | `restore_existing_data_warning` | **D** | **Does not yet show the mandatory pre-replace safety-backup step as its own distinct step** — it goes directly from the existing-data warning to the "Restore & Replace" confirmation. This was compliant against the design instructions in effect when it was built, but the project owner has since finalized the restore-onto-existing-data policy to require a mandatory safety-backup-then-validate step *before* this confirmation (`/docs/changelog.md`, `/docs/01-product-requirements.md` §14). **This is the single most important finding in this audit** — already tracked in `/docs/architecture/unresolved-decisions.md` and `/docs/ui/02-stitch-final-correction.md`, restated here because a screen-by-screen audit would be incomplete without flagging it directly against the screen itself. Everything else on this screen (explicit checkbox, named "Cancel"/"Restore & Replace" buttons, itemized consequence list) is fully compliant with §8.21. |
| 19 | `restore_existing_data_warning_persian_rtl` | **D** (same as #18) | Same missing-safety-backup-step gap as the LTR version; Vazirmatn/RTL execution itself is compliant. |
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

## Summary counts

| Classification | Count | Screens |
|---|---|---|
| A — Compliant | 24 | 1,2,3,4,8,10,11,12,13,14,15,16,17,20,21,22,23,24,25,26,27,28,31,32 |
| B — Minor deviation | 6 | 5,6,7,9(partial),29,30 |
| C — Documented exception | 0 screen-level (see cross-cutting table for the one C item: stock photo placeholders) | — |
| D — Must correct | 3 screens carrying the most consequential gaps | 9(partial, empty/loading states),18,19 |

**The two `restore_existing_data_warning` screens (18/19) are the only
Category D findings with product-level consequence** — everything else
classified D is either a cross-cutting implementation-phase item (focus
rings, `aria-label`s, dark mode, touch-target hit-areas — none of which
block treating the *design* as ready, since they're markup/implementation
concerns) or a missing-but-not-yet-needed state (empty/loading variants for
list screens).
