# Changelog

Architectural and product decisions are recorded here as they are made, per the
documentation rule in PRODUCT.md. This is a decision log, not a release changelog —
entries exist even before any code ships.

---

## 2026-08-08 — Phase 0 discovery

**Change**: Created `/docs/00-project-overview.md` documenting the current
repository state (bare Electron/React/TS scaffold, no product code).

**Reason**: PRODUCT.md requires repository inspection and documentation before any
implementation.

**Affected modules**: None (documentation only).

**Migration requirements**: None.

**Tests**: None yet.

---

## 2026-08-08 — Confirmed decision: target platform is a real mobile app

**Change**: Confirmed the application will be built as a genuine mobile app (React
Native or Capacitor, to be finalized in Phase 3), not the existing Electron desktop
scaffold.

**Reason**: PRODUCT.md's mobile-first, one-handed-use, OTP-by-mobile-number, and
offline-resilience requirements are incompatible with a desktop shell. Flagged as
an open question in Phase 0; resolved by the project owner.

**Affected modules**: Application shell/platform (all future UI, navigation, and
native-capability work). The current `src/main`, `src/preload`,
`src/renderer` Electron scaffold is not the foundation going forward.

**Migration requirements**: Full platform migration in a future implementation
phase; not started yet.

**Tests**: N/A (no code changed).

---

## 2026-08-08 — Confirmed decision: OTP/SMS provider to be proposed in Phase 3

**Change**: No SMS/OTP provider is mandated. Phase 3 architecture must propose a
concrete provider and backend approach for project-owner confirmation.

**Reason**: Avoids hard-coding a vendor decision before backend architecture is
designed; keeps referral/OTP server-side validation requirements (PRODUCT.md
Authentication section) intact regardless of provider.

**Affected modules**: Authentication/backend (future).

**Migration requirements**: None yet.

**Tests**: N/A.

---

## 2026-08-08 — Confirmed decision: matching engine must be deterministic and AI-independent

**Change**: The core matching engine MUST NOT depend on any external AI API or
paid AI service. The first production version must be a deterministic, rule-based,
configurable scoring engine operating on structured fields, supporting priority
levels (MUST_HAVE, IMPORTANT, PREFERRED, IGNORE), hard constraints, exclusions,
numeric ranges, exact/approximate values, locations, amenities, preferences, and
weighted scoring, with a fully explainable result (matched/mismatched/ignored
criteria, critical requirements). AI, if introduced later, is strictly an optional
enhancement layer (e.g. natural-language input → structured, user-confirmed
requirements → deterministic engine) and must never sit in the critical path of
producing a match score. The application must remain fully functional with zero AI
API configured, at every phase.

**Reason**: Explicit project-owner directive, given in advance of Phase 1, to
prevent this constraint from being violated by any future architecture or
implementation decision. Recorded before Phase 1 begins so it binds all subsequent
requirements, user stories, architecture, database schema, and matching-engine
design.

**Affected modules**: Matching engine (core), requirement/criterion data model
(database design, Phase 4), future `/docs/matching/*.md` docs, any future
natural-language-input feature (must be built as an optional pre-processing layer
only).

**Migration requirements**: None yet — no matching engine code exists. This
decision constrains its initial design; there is no migration away from an
AI-dependent version because one was never built.

**Tests**: To be defined in `/docs/testing/test-plan.md` and
`/docs/matching/*.md` — matching engine tests must validate deterministic behavior
without any AI dependency, including edge cases such as "pool is essential, ignore
price/area/bedrooms."

---

## 2026-08-08 — Final Phase 0 validation pass

**Change**: Reviewed `/docs/00-project-overview.md` against the three confirmed
decisions (§2a) for internal consistency. Added: a React Native vs. Capacitor
trade-off comparison (§Decision 1, still deferred to Phase 3 for the final call);
an explicit restatement of the mobile-number + OTP + mandatory-referral-code
registration requirements and server-side referral validation (§Decision 2); a new
§8a documenting that backup/encryption and security architecture are entirely
undesigned so far (a real gap, not a decision); an offline/performance
architecture-risk note on sync/conflict-resolution and list caching strategy
(§8); and a new §11a listing database entity/relationship risks to resolve
explicitly in Phase 4 (referral direction modeling, structured-vs-free-text
separation, match explainability storage, reminder idempotency keys,
notification source references, backup/audit metadata dependence on the
not-yet-designed encryption spec).

**Reason**: Explicit project-owner request for a final Phase 0 validation pass
before Phase 1 begins, to confirm decisions are correctly reflected throughout
the document and to surface any remaining gaps or risks.

**Affected modules**: Documentation only (`/docs/00-project-overview.md`). No
application code exists yet; no code changed.

**Migration requirements**: None.

**Tests**: N/A.

---

## 2026-08-08 — Phase 1 (Product Requirements) and Phase 2 (User Stories)

**Change**: Created `/docs/01-product-requirements.md` (comprehensive functional,
UX, performance, and security requirements covering authentication, profile,
owner files, applicant files, matching, search/filtering, contracts, reminders,
notifications, backup, and offline behavior) and `/docs/02-user-stories.md` (67
user stories across 18 workflow areas, each with ID/actor/goal/description/
preconditions/main flow/alternative flows/error cases/acceptance criteria/
priority). Both documents label every requirement/story as CONFIRMED, BUSINESS
RULE, OPEN-ARCH, or ASSUMPTION, and end with a Confirmed Decisions / Open Product
Decisions / Open Architectural Decisions / Assumptions / Risks / Questions
summary.

**Reason**: Explicit project-owner approval of Phase 0 and instruction to proceed
to Phase 1 and Phase 2, per PRODUCT.md's phased documentation-first process, with
explicit constraints not to finalize RN vs. Capacitor, an OTP provider, the
encryption design, the matching engine's internal implementation, or the final
database schema in this phase.

**Affected modules**: Documentation only. No application code was written. The
matching engine requirements (§9 of 01-product-requirements.md; MATCH/MEXP stories
in 02-user-stories.md) explicitly restate and preserve the AI-independence
constraint from Phase 0 Decision 3, including the required pool/MUST_HAVE worked
example (MATCH-03) and a dedicated "no AI dependency" regression scenario
(MATCH-05). Backup/security requirements (§14, §18; BKP/RST/IE/SEC stories) are
written as product-level requirements only — encryption algorithm and key
management remain explicitly deferred. Offline requirements (§15; OFF/SYNC
stories) establish behavior (view/edit offline, auto-sync, no silent data loss on
conflict) without committing to a sync/conflict-resolution architecture.

**Migration requirements**: None — documentation only.

**Tests**: None yet; MATCH-03, MATCH-05, and REM-03 are flagged in
02-user-stories.md as required regression-test scenarios for when the matching
engine and reminder scheduler are implemented in a later phase.

---

## 2026-08-08 — Confirmed decision: local-first / offline-first (Phase 1/2 amendment)

**Change**: Recorded a new confirmed product decision (Phase 0 Decision 4 in
`/docs/00-project-overview.md` §2a) and amended the already-approved Phase 1 and
Phase 2 documents in place — **not** a restart of either phase:

- The application is local-first/offline-first: normal daily business operation
  (owner/applicant file management, search, filtering, matching and match
  explanations, contract tracking and expiration calculations, reminder
  scheduling, local notifications, notes, settings, and encrypted backup
  creation/import/validation/restore) requires no internet access.
- Business data (owner/applicant/property information, requirements, notes,
  contracts, matches, match explanations, reminders, local business history) is
  not uploaded to a server during normal operation and remains local by
  default. No cloud database, cloud matching, cloud sync, or cloud backup is
  required.
- Network access for this version is limited to the account/referral surface:
  mobile number registration, OTP/SMS verification, referral code validation,
  and recording the registered number/referral relationship.
- Contract reminders use local device notifications, not push notifications —
  push delivery infrastructure is not required for v1.
- There is no requirement for multi-device cloud synchronization. Cross-device
  data movement is only the explicit, user-controlled manual backup
  export/transfer/import/restore flow. CRDTs, real-time sync, cloud
  replication, and automatic conflict-resolution infrastructure are explicitly
  out of scope unless a future product decision requires them.
- The encryption algorithm and key-management architecture remain
  **explicitly deferred** to the architecture/security phase — this decision
  clarifies what the backup/local-storage design must support (a fully
  offline, non-cloud-dependent store), not how it will be implemented.

**Reason**: Explicit project-owner clarification, provided after Phase 1/2 were
already documented and approved. The instruction was to amend the existing
documents in place, preserving all prior work, rather than recreate them.

**Affected modules**:
- `/docs/00-project-overview.md` — added Decision 4 in §2a; corrected the
  offline/performance architecture-risk note (§8) and the recommended
  architecture's local-storage description (§10), which had previously implied
  outward syncing, to reflect that local storage is the sole source of truth
  for business data with no required cloud counterpart.
- `/docs/01-product-requirements.md` — added §4a (Connectivity Classification:
  OFFLINE / ONLINE_REQUIRED / ONLINE_OPTIONAL, covering every workflow);
  rewrote §13 (Notifications) to specify local device notifications instead of
  push; rewrote §14 (Backup) to state no cloud backup is required; rewrote §15
  (Offline) to remove the sync/conflict-resolution framing that assumed a
  cloud business-data counterpart and replace it with the local-first model;
  updated §5 (Authentication) with explicit ONLINE_REQUIRED framing and
  graceful-failure requirements; updated §18 (Security) to scope network
  security to the account/referral surface only; updated §19 (Summary) to
  record the new confirmed decision and mark the previously open
  multi-device-sync question (§19.6, former question 4) as resolved. Also
  fixed several pre-existing cross-reference errors (stray "§16" references
  that should have pointed to §19's open-decisions/open-questions
  subsections) found during this pass.
- `/docs/02-user-stories.md` — added a connectivity tag
  (OFFLINE/ONLINE_REQUIRED/ONLINE_OPTIONAL) to every story; added AUTH-06
  (registration/login blocked offline with clear messaging), REF-06 (referral
  validation requires connectivity), and RST-05 (explicit user-controlled
  restore on another device); rewrote NOTIF-01 and NOTIF-03 for local
  notifications instead of push; rewrote the Offline Behavior section (OFF-01
  through OFF-03) to describe offline as the normal mode rather than a
  fallback; renamed and rewrote the Synchronization section to
  "Network-Dependent Operation Behavior," replacing SYNC-01's business-data
  auto-sync premise and SYNC-02's conflict-resolution premise (both no longer
  applicable) with SYNC-01 (retrying the account/referral surface),
  SYNC-02 (multi-device sync is now a confirmed **non-goal**, tested as a
  regression), and SYNC-03 (no false-success state for network-dependent
  operations); updated the Summary section accordingly. Story count: 70 (up
  from 67).

**Migration requirements**: None — documentation only; no application code
exists yet.

**Tests**: None yet. SYNC-02 is newly flagged as a required regression test
once implementation begins: no future change may introduce implicit
multi-device sync behavior. AUTH-06 and REF-06 are flagged as required
graceful-degradation tests for the account/referral online surface.

---

## 2026-08-08 — Phase 3: Architecture documentation and analysis

**Change**: Created a full Phase 3 documentation set — architectural analysis
only, no application code, no dependencies installed, no implementation
started:

- `/docs/architecture/00-architecture-overview.md` — system shape, component
  responsibilities, background jobs, error-handling posture, document map.
- `/docs/architecture/decisions/ADR-001-mobile-platform.md` — React Native vs.
  Capacitor analyzed against all 16 requested criteria; **[PROPOSED]** React
  Native, explicitly not finalized, with team-composition/code-reuse caveats.
- `/docs/architecture/decisions/ADR-002-local-database-source-of-truth.md` —
  **[PROPOSED]** SQLite as the local database technology (source of truth,
  not a cache), analyzed against document/NoSQL and sync-oriented-framework
  alternatives.
- `/docs/architecture/decisions/ADR-003-otp-provider-deferred.md` — records
  the OTP/SMS provider decision as explicitly deferred, with selection
  criteria for later.
- `/docs/local-data/local-data-architecture.md` — indexing, migrations,
  transactions, large-dataset performance, search, matching queries,
  integrity, backup extraction, restore, schema versioning.
- `/docs/backup/backup-architecture-analysis.md` — backup format, encryption
  requirements and key-management options analyzed (hybrid approach
  **[PROPOSED]**, not finalized), integrity/authentication, versioning,
  corruption detection, wrong-password behavior, restore validation,
  restore-onto-existing-data, safe rollback on failed restore. No algorithm
  or key-management implementation selected.
- `/docs/security/authentication-otp-architecture.md` — registration/OTP/
  session/referral flow analysis, rate limiting, retry limits, duplicate-
  phone prevention, abuse prevention, offline-after-authentication behavior.
  Session-lifecycle Option A vs. B flagged as an open trade-off. No OTP
  provider selected.
- `/docs/security/threat-model.md` — assets, threats, and mitigation status
  across local data, secure key storage, authentication/session, backup,
  sensitive-data exposure, logs, app-switcher/screenshot privacy, clipboard
  risk, and export/import risk, plus explicit non-goals consistent with the
  local-first/no-AI/no-multi-device-sync decisions.
- `/docs/matching/matching-architecture.md` — four-stage conceptual pipeline
  (hard-constraint filter → per-criterion evaluation → weighted score
  aggregation → explanation assembly) satisfying MUST_HAVE/IMPORTANT/
  PREFERRED/IGNORE, hard constraints/exclusions/ranges/exact/approximate/
  location/amenities, two-way matching, and mandatory explainability, with
  zero AI dependency. Scoring formula explicitly deferred to Phase 4.
- `/docs/notifications/notification-architecture.md` — expiration
  calculation, reminder scheduling with idempotency enforced via a unique
  `(contract_id, offset)` constraint, local (not push) notification delivery,
  device-restart self-healing via re-deriving from the `Reminder` source of
  truth, timezone/date-handling requirement, restore behavior, notification-
  permission-denial fallback, and OS-imposed scheduling-limit risk.
- `/docs/database/conceptual-data-model.md` — conceptual entities and
  relationships (User, ReferralRelationship, Session, OwnerFile,
  ApplicantFile, RequirementCriterion, Restriction, Amenity, Location, Match,
  MatchExplanation, Contract, ContractHistoryEntry, Reminder, Notification,
  BackupMetadata, AuditLogEntry) with important constraints and indexing
  considerations. Explicitly not the final production schema — that remains
  Phase 4.
- `/docs/architecture/ux-dependencies.md` — consolidates every
  UX-dependent decision flagged across the other Phase 3 documents,
  confirming no screens/navigation were invented ahead of the forthcoming
  Stitch designs.
- `/docs/architecture/unresolved-decisions.md` — consolidated tracker of
  every open item across the full Phase 3 document set plus carried-over
  Phase 1/2 open product questions.

**Reason**: Explicit project-owner authorization to proceed to Phase 3,
documentation/architectural-analysis only, with an explicit list of binding
local-first/offline-first constraints and a list of decisions that must be
analyzed but not finalized (mobile platform, encryption/key management, OTP
provider, matching scoring formula, final database schema).

**Affected modules**: Documentation only. No application code was written, no
dependencies were installed, and no existing implementation was modified. The
Electron scaffold in `src/` is untouched.

**Migration requirements**: None — documentation only.

**Tests**: None yet. This phase does not implement the matching engine,
reminder scheduler, backup system, or auth flow — it establishes the
conceptual architecture and constraints those future implementations, and
their tests, must satisfy.

---

## 2026-08-08 — Phase 3 corrections: encryption requirement, session lifecycle rule, UX dependency expansion, implementation order

**Change**: Conditionally-approved Phase 3 review produced four required
corrections, applied across the existing Phase 3 documents (not a restart):

1. **Local database encryption** — `/docs/security/threat-model.md`'s "Local
   data protection" section previously framed at-rest encryption as an open
   yes/no question. Corrected: encryption of sensitive local business data at
   rest is now a **[CONFIRMED REQUIRED]** security requirement, explicitly
   separated from the still-**[DEFERRED]** algorithm and key-management
   implementation choices. `/docs/architecture/decisions/ADR-002-local-database-source-of-truth.md`
   updated to reflect the same distinction. Local device compromise and
   stolen/lost device (including forensic extraction) are now named
   explicitly as the threats this requirement addresses.
2. **Session lifecycle — critical offline-first rule** —
   `/docs/security/authentication-otp-architecture.md`'s session lifecycle
   section rewritten. The prior "Option A vs. Option B" framing incorrectly
   treated offline-first purity and session security as competing
   alternatives. Corrected: background re-validation may run when online, but
   a strict distinction is now confirmed policy — **NETWORK FAILURE** (no
   connectivity, timeout, temporary server unavailability) never logs the
   user out or blocks core functionality; only an explicit
   **AUTHENTICATION FAILURE** response from a reachable server triggers the
   defined security response. The remaining trade-off (a stolen, kept-offline
   device retains local session access until it reconnects) is named
   explicitly rather than resolved. `/docs/security/threat-model.md` updated
   to reference this distinction under Authentication/session protection.
3. **UX dependencies expanded** — `/docs/architecture/ux-dependencies.md`
   rewritten with a three-way classification (FINALIZE NOW / WAIT FOR STITCH
   / INDEPENDENT OF UI) applied to all 16 requested areas (navigation,
   one-handed interaction, form architecture, shared owner/applicant fields,
   search/filtering, matching workflow, match explanation presentation,
   contract workflow, reminder management, backup/export/import UX, restore
   workflow, offline/loading/empty/error states, destructive-action
   confirmation, notification permission UX), separating what's
   architecturally settled now from what genuinely waits for Stitch.
4. **Implementation order corrected** — `/docs/architecture/00-architecture-overview.md`
   gained a "Revised implementation order" section placing Stitch UI/UX
   design and review immediately after Phase 3 architecture analysis and
   before final data/security/auth/matching design work and production
   implementation, per the project owner's specified product workflow.

Additionally, `/docs/security/threat-model.md` was expanded with explicit
threat entries for brute-force backup password attempts (offline,
un-rate-limitable — establishing a slow/memory-hard KDF as a confirmed
constraint on the still-deferred KDF choice) and OTP abuse, and
`/docs/architecture/unresolved-decisions.md` was updated to move the local-DB-
encryption and session-lifecycle-policy items from "open" to "policy
resolved, mechanism open."

**Reason**: Explicit project-owner correction after conditional Phase 3
approval — implementation still not authorized to begin.

**Affected modules**: Documentation only. No application code was written, no
dependencies were installed. React Native remains the proposed (not final)
platform candidate; encryption algorithm, KDF, key management, OTP provider,
final scoring formula/weights, final database schema, migration tooling, and
exact rate limits all remain explicitly unresolved, per instruction.

**Migration requirements**: None — documentation only.

**Tests**: None yet. The corrected session-lifecycle rule (NETWORK FAILURE vs.
AUTHENTICATION FAILURE) and the required at-rest encryption are both flagged
as behaviors that will need dedicated tests once implementation begins —
recorded here so they aren't lost between this phase and the testing phase.

---

## 2026-08-08 — Stitch UI/UX design handoff review

**Change**: Reviewed the delivered Stitch design set (9 screens + a
`DESIGN.md` design-system spec, "Executive Precision" / "EstatePro CRM")
against the approved product requirements, user stories, and full Phase 3
architecture set. Created `/docs/ui/00-ui-handoff-review.md`. Review only —
no application code written or modified, no dependencies installed, no
database schema created.

**Reason**: Explicit project-owner request for a design-handoff validation
pass before production implementation begins.

**Findings summary**: Three **blocking** conflicts between the design and
confirmed architecture were identified and documented (not silently
corrected): (1) a "Cloud Sync — Encrypted remote storage" toggle, on by
default, in the Backup & Security screen, plus backup-history entries
labeled "Automatic Cloud Backup" with one failing due to "Network Timeout" —
directly contradicting the confirmed no-cloud-backup, local-first
requirement (Phase 0 Decision 4); (2) the same screen names "AES-256
encryption" and claims a "master password is never stored on our servers,"
prematurely naming an algorithm and presupposing server-side custody where
none is architected; (3) the match-explanation screen's "Smart Analysis"
panel uses a sparkle (`auto_awesome`) icon and AI-summary-style presentation
that risks implying the deterministic matching engine's explanation is
AI-generated, contradicting Phase 0 Decision 3's explicit instruction that
the UI must not imply AI is making the matching decision. A fourth
significant issue — navigation items and copy ("Global Realty Group," "Team
Directory," "Brokerage Login") assuming a multi-agent/team account model —
was also flagged as blocking for the affected navigation, since it depends
on an explicitly open, unresolved product question (Phase 1 §19.6 Q1).
Additional non-blocking findings: several key screens/states are missing
entirely from this delivery (file edit/detail, ranked match-candidate lists,
full restore-flow states, reminder-schedule configuration, notification-
permission states, destructive-action confirmation, and all loading/empty/
error states); no RTL/Persian designs were provided at all; a minor,
correctable border-radius token mismatch exists between `DESIGN.md` and the
per-screen embedded Tailwind config.

**Affected modules**: Documentation only
(`/docs/ui/00-ui-handoff-review.md`). No application code, dependencies, or
database schema were touched. The Stitch design files themselves were not
modified and were not copied into the git repository as part of this review.

**Migration requirements**: None.

**Tests**: None yet. The blocking findings above must be resolved (by
project-owner/design decision) before the affected screens can be treated as
ready for implementation.

---

## 2026-08-08 — Stitch UI/UX Revision 2: final validation

**Change**: Performed a file-by-file (SHA-256 hash) diff of the revised
Stitch design package (16 screen folders, up from 9) against Revision 1, and
validated it against the approved requirements, Phase 3 architecture, and the
prior UI review. Created `/docs/ui/01-stitch-final-validation.md`. Review
only — no application code written or modified, no dependencies installed, no
database schema created.

**Reason**: Explicit project-owner request for final UI/UX validation before
implementation.

**Findings summary**: Of the four Revision 1 blockers — Cloud Sync (Blocker
1) and premature encryption/server-custody claims (Blocker 2) are **resolved
at the code level** in `settings_backup_security/code.html` and the new
`settings_backup_management/code.html`; the AI-implication issue (Blocker 3)
remains **unresolved** — the only match-detail screen in this revision
(`smart_matching_match_analysis_persian_rtl`) still carries the same "Smart
Analysis" sparkle-icon presentation flagged previously; the team/brokerage
assumption (Blocker 4) is **partially resolved** (removed from the referral
screen, but "Global Realty Group"/"Team Directory" persist in the navigation
shell across most other screens, still pending the underlying open product
decision). Two new blocking issues were found: a "60 Days Before" reminder
row on the new `settings_contract_reminders` screen includes an "Email Alert
/ Edit Recipients" control, reintroducing an unapproved, network-dependent
notification channel into a workflow required to be entirely local; and that
same screen represents only 5 of the confirmed 7 default reminder offsets
(missing 7-day and 3-day), with no way to add them. A packaging-level
blocking issue was also found: `settings_backup_security/screen.png` is
byte-identical to the pre-fix Revision 1 image and still visually shows the
removed Cloud Sync toggle, even though its corresponding code was correctly
fixed — the screenshot asset needs regenerating. Positive additions this
revision: a ranked match-results list screen (filling a Revision 1 gap), an
owner file detail screen (filling another gap), a backup-creation flow with
password/confirm-password entry and a genuine progress state, and partial
RTL/Persian coverage (2 of 16 screens) — though with inconsistent numeral
systems and an untranslated narrative paragraph on the Persian match-analysis
screen. The border-radius design-token mismatch from Revision 1 remains
unresolved.

**Affected modules**: Documentation only
(`/docs/ui/01-stitch-final-validation.md`). No application code,
dependencies, or database schema were touched. The Stitch design files
themselves were not modified and were not copied into the git repository.

**Migration requirements**: None.

**Tests**: None yet. Final gate classification: **NOT READY — BLOCKING
ISSUES**. Five blocking issues documented with exact file paths and
recommended corrections in `/docs/ui/01-stitch-final-validation.md`; none
resolved silently by this review.

---

## 2026-08-08 — Stitch UI/UX final correction pass

**Change**: Corrected all five blocking issues from
`/docs/ui/01-stitch-final-validation.md` directly in the Stitch design
package and added the nine explicitly missing implementation-critical
screens. This is a **design-artifact correction**, not application
implementation: no code in `src/`, no application dependency, and no
database schema were touched. The corrected package
(`stitch_elite_real_estate_crm/`, 32 screens) is committed to this
repository for the first time, at `/design/stitch/` — the location the
design handoff referenced.

**Corrections applied**:
1. Removed "Smart Analysis"/sparkle-icon/AI-implying presentation from
   `smart_matching_match_analysis_persian_rtl/`; replaced with a plain
   "Match Explanation" panel whose Persian copy explicitly states the result
   is deterministic and does not use AI; added the previously missing
   **Ignored** criteria section.
2. Removed "Email Alert / Edit Recipients" from
   `settings_contract_reminders/`; added an explicit local-notification
   banner.
3. Added the missing 7-day and 3-day reminder offsets to
   `settings_contract_reminders/`, completing the confirmed default schedule
   (90/60/30/14/7/3/On Expiration). Flagged a discrepancy: the correction
   task's own text said "1 day before" for the seventh offset, which
   conflicts with the already-approved "expiration day itself" — implemented
   the approved value and did not silently change the confirmed business
   rule.
4. Regenerated `settings_backup_security/screen.png` from its current,
   already-corrected `code.html` via an actual render (previously
   byte-identical to the pre-fix image); also fixed a residual "Failed:
   Network Timeout" label on a now-"Local" backup entry (changed to "Failed:
   Insufficient Storage Space") and swapped a leftover cloud-shaped status
   icon for a neutral one.
5. Removed "Global Realty Group" and "Team Directory" from the four
   remaining screens that still had them
   (`contract_management_timeline/`, `matching_ranked_results/`,
   `file_management_all_files/`, `settings_backup_security/`).
6. Added a complete restore workflow across 8 screens covering all 12
   required states (select, validate, password entry, wrong password,
   corrupted, incompatible version, existing-data warning, explicit
   confirmation, progress, success, failure, safe cancellation) — the
   overwrite-vs-block policy itself remains an open architectural decision,
   not resolved by this design pass.
7. Added an Applicant Detail screen showing structured requirements with
   explicit MUST_HAVE/IMPORTANT/PREFERRED/IGNORE priority chips.
8. Added Owner Edit and Applicant Edit screens reusing existing form
   components, with validation-error and unsaved-changes states.
9. Added a reusable destructive-action confirmation pattern (delete-file
   example) with explicit Cancel/Delete (or Cancel/Restore & Replace)
   actions, never a bare "OK."
10. Reconciled the border-radius token mismatch: every screen's embedded
    Tailwind config now matches `DESIGN.md`'s authoritative scale.

Added RTL/Persian variants for the five most safety/product-critical new
categories (applicant detail, owner edit, destructive confirmation, restore
existing-data warning, reminder configuration), on top of the two
pre-existing RTL screens (dashboard, match explanation). **All 32 screens'
screenshots were regenerated** from their current source via a real headless-
browser render (Tailwind compiled from each file's own embedded tokens, real
Geist/Inter/Vazirmatn/Material Symbols fonts) — not placeholders, not stale
copies — specifically so the radius-token fix (applied to all 15 pre-existing
files) doesn't recreate the exact code/screenshot mismatch this pass was
tasked with closing. A final recursive scan for every previously prohibited
term (Cloud Sync, Smart Analysis, AI, AES-256, server storage/backup, email
alerts, push notifications, team, brokerage, Global Realty Group, Team
Directory, auto_awesome) returned zero matches anywhere in the UI content.

**Reason**: Explicit project-owner instruction to correct the remaining
blocking issues and missing implementation-critical screens identified in
the prior final validation, and re-run an independent review afterward.

**Affected modules**: `/design/stitch/stitch_elite_real_estate_crm/` (design
package, newly committed to the repo) and
`/docs/ui/02-stitch-final-correction.md` (this correction's documentation).
No application code, dependencies, or database schema were touched.

**Migration requirements**: None.

**Tests**: None yet. Final gate classification: **READY WITH MINOR FIXES**
— see `/docs/ui/02-stitch-final-correction.md` for the full breakdown of
non-blocking remaining items (no LTR match-explanation screen, no
notification-permission-denied screen, partial RTL coverage, two product
decisions still needing explicit confirmation).

---

## 2026-08-08 — FINAL product decision: default contract reminder offsets

**Change**: The seven default contract-reminder offsets are confirmed
**FINAL**: 90 days before, 60 days before, 30 days before, 14 days before, 7
days before, 3 days before, and **on the expiration date itself** ("On
Expiration"). **"1 day before" is explicitly not the seventh default** and
must not be used anywhere in documentation or design.

**Reason**: Explicit project-owner decision, made before Phase 4 begins, to
close a discrepancy this session had already flagged (but not silently
resolved) between an earlier correction-round instruction that said "1 day
before" and the previously-approved requirement of "the expiration day
itself." The project owner has now confirmed the originally-approved value
is the final one.

**Affected modules**: Documentation only. Updated
`/docs/01-product-requirements.md` (§14/§19.1, marking the decision FINAL and
resolving the corresponding open-item entry in §19.3),
`/docs/architecture/unresolved-decisions.md` (added an explicit FINAL note
under Contracts/reminders/notifications so "1 day before" is never
reintroduced by mistake), and `/docs/ui/02-stitch-final-correction.md`
(updated its discrepancy note to reflect resolution). No documentation
elsewhere in the repository was found to contain "1 day before" as an actual
(non-historical/non-explanatory) value — `/docs/01-product-requirements.md`
§12, `/docs/notifications/notification-architecture.md`, and the delivered
`settings_contract_reminders/` design already used "on the expiration day
itself" / "On Expiration" consistently, so no contradiction existed there.

**Migration requirements**: None — documentation only; no application code
or schema exists yet.

**Tests**: None yet. This confirms the value that
`/docs/02-user-stories.md` REM-01 and the reminder-scheduling architecture
(`/docs/notifications/notification-architecture.md`) must be tested against
once implementation begins.

---

## 2026-08-08 — FINAL product decision: restore onto a device with existing local data

**Change**: Restoring a backup onto a device that already has existing local
business data **must never silently overwrite it**. The mandatory sequence
is now confirmed **FINAL**:

1. Detect existing local business data on the device.
2. Clearly warn the user that continuing will replace it.
3. Require a safety backup of the device's *current* data to be created.
4. Require that safety backup to validate successfully — if it cannot be
   completed successfully, the restore does not proceed.
5. Require explicit, unambiguous user confirmation (e.g. "Restore &
   Replace," never a bare "OK") before replacing the existing dataset.
6. Perform the restore only after both validation and confirmation have
   completed successfully.
7. Verify the restored dataset.
8. The user must be able to cancel at any point before the actual restore
   step, leaving existing data completely untouched.

This resolves the "block vs. overwrite" question that had been recorded as
open architecture across multiple Phase 3 documents since restore-related
analysis began: the answer is neither a hard block nor a silent overwrite,
but a mandatory safety-backup-then-explicit-replace flow.

**Reason**: Explicit project-owner decision, grounded in the already-
confirmed local-first principle that the local database is the primary
source of truth — for a store with no server backstop, an unprotected
overwrite would be an unrecoverable data-loss risk. Made before Phase 4
begins so the database and backup architecture are designed against the
final policy, not a placeholder.

**Affected modules**: Documentation only. Updated
`/docs/01-product-requirements.md` (§14 — added as a new CONFIRMED FINAL
requirement with the full 7-step sequence; §15 — resolved the corresponding
open item; §19.1/§19.3 — moved from open architectural decision to confirmed
FINAL decision), `/docs/02-user-stories.md` (updated RST-05's "Alternative
flows" and added a new story, **RST-06**, defining the mandatory sequence as
its own testable acceptance criteria; updated the Summary's "Open
architectural decisions" section), `/docs/local-data/local-data-architecture.md`
(§Restore — resolved, with the technical implication that the pre-restore
safety backup must complete and validate before the live database is
touched at all), `/docs/backup/backup-architecture-analysis.md` (§Restore to
a device containing existing data, §Safe rollback if restore fails —
resolved and extended), `/docs/architecture/ux-dependencies.md` (§Restore
workflow — moved from "WAIT FOR STITCH" to "FINALIZE NOW," since Stitch has
already delivered corresponding screens), and
`/docs/architecture/unresolved-decisions.md` (moved from open to resolved in
both the Local data and Backup/encryption sections).

**Contradiction found during this update — not fully closed by documentation
alone**: the already-delivered `restore_existing_data_warning/` Stitch
screen (and its RTL counterpart) does not yet show the mandatory pre-replace
safety-backup step as its own distinct step — it currently goes directly
from the existing-data warning to the replace confirmation. This is now a
tracked, flagged gap between the final product decision and the delivered
design (`/docs/ui/02-stitch-final-correction.md` §F addendum,
`/docs/architecture/unresolved-decisions.md`), requiring a follow-up design
correction pass (not performed in this documentation-only update) before the
restore flow can be considered fully aligned with this decision.

**Migration requirements**: None — documentation only; no application code
or schema exists yet.

**Tests**: None yet. RST-06 in `/docs/02-user-stories.md` is the required
regression-test scenario for this decision once backup/restore is
implemented: no code path may exist where existing local business data is
modified before both a validated safety backup exists and the user has
explicitly confirmed the replacement.

---

## 2026-08-08 — Material 3-founded AZAR Design System standardization

**Change**: Created the authoritative UI design system for implementation,
using Material Design 3 as the structural foundation reconciled against the
existing Stitch design set (32 screens) rather than a generic Material
clone. No application code, dependencies, or schema were touched; no screens
were redesigned.

- `/docs/ui/design-system.md` — the authoritative specification: typography
  (LTR Geist/Inter scale + a parallel RTL Vazirmatn scale with an explicit
  +15-17% line-height uplift rule and a mixed-direction/numeral-system
  rule), spacing (`space-0`…`space-16`, grounded in the 4px-increment scale
  already in consistent use rather than a newly invented one), a
  Compact/Medium/Expanded adaptive grid, layout tokens, a full component
  specification (buttons through date pickers, including two new
  Material-3-sourced components — Snackbars and Date Pickers — that had no
  existing product usage to reconcile against), touch-target rules (48dp
  minimum, documented against every existing interactive element), shape/
  radius tokens (keeping the prior radius-mismatch fix as final), an
  elevation system (5 steps, deliberately narrower than Material 3's full
  range to preserve the "minimal, premium, calm, professional" brand
  direction), a semantic color system (reconciling `DESIGN.md`'s prose color
  descriptions against the actually-implemented token hex values, which did
  not match each other), iconography rules (explicit RTL mirroring
  guidance, and a permanent, standing prohibition on AI/cloud-implying
  iconography — not just a one-time fix), a motion system, interaction-state
  rules, and dedicated Matching UI (§18) and Offline-First Visual Language
  (§19) sections directly enforcing the confirmed deterministic-matching and
  local-first product decisions at the visual-design level.
- `/docs/ui/design-tokens.json` — the machine-readable numeric source of
  truth mirroring every token in `design-system.md`, validated as parseable
  JSON, with dark-mode color values explicitly left unpopulated (flagged,
  not guessed) since no dark palette has actually been designed yet.
- `/docs/ui/design-system-audit.md` — a screen-by-screen audit of all 32
  Stitch screens, classifying each as Compliant / Minor deviation /
  Documented exception / Must correct. 24 screens fully compliant, 6 with
  minor deviations (mostly the ad hoc icon-size vocabulary and one screen —
  `dashboard_home_persian_rtl` — still on Latin-font fallback rather than
  the now-formalized Vazirmatn typeface), and one substantive finding
  restated directly against its screens: `restore_existing_data_warning`
  and its RTL counterpart do not yet show the mandatory pre-replace
  safety-backup step as its own distinct step, per the restore-onto-
  existing-data decision finalized earlier in this session — already
  tracked in `/docs/architecture/unresolved-decisions.md` and
  `/docs/ui/02-stitch-final-correction.md`, restated here as a direct
  per-screen audit finding rather than left implicit.

**Reason**: Explicit project-owner instruction to formalize a Material
3-founded design system before Phase 4 implementation begins, so future UI
work has one authoritative specification rather than per-screen ad hoc
decisions.

**Affected modules**: Documentation only
(`/docs/ui/design-system.md`, `/docs/ui/design-tokens.json`,
`/docs/ui/design-system-audit.md`). No application code, dependencies, or
database schema were touched. No Stitch design file was modified as part of
this pass — this was an audit and specification exercise, not a correction
pass.

**Migration requirements**: None — documentation only.

**Tests**: None yet. The audit's Category D findings (missing focus-ring
states, missing `aria-label`s, the restore safety-backup step, missing
empty/loading states) are the concrete follow-up items for the next design-
correction or implementation pass.

## 2026-08-08 — FINAL UI correction pass before Phase 4: restore safety-backup flow, 48dp touch targets, warning/error separation, dark-mode deferral confirmed

**What changed**: The Material 3-founded AZAR Design System (previous
entry) is approved as the authoritative Phase 4 UI specification, but one
product-critical UI gap remained: the restore safety-backup flow did not
show its mandatory safety-backup step as a distinct state. This pass makes
four corrections, all documentation- and design-package-level only:

1. **Restore safety-backup flow completed as ten distinct states.** The
   finalized product decision (recorded earlier in this changelog under
   "FINAL product decision: restore onto a device with existing local
   data") is now fully represented, state by state, with no states
   silently combined:
   1. Existing Data Detected — `restore_existing_data_detected` (+ RTL, new)
   2. Safety Backup Required — `restore_safety_backup_required` (+ RTL, new)
   3. Creating Safety Backup — `restore_safety_backup_progress` (+ RTL, new)
   4. Safety Backup Success — `restore_safety_backup_success` (+ RTL, new)
   5. Safety Backup Failure — `restore_safety_backup_failure` (+ RTL, new)
   6. Restore & Replace Confirmation — `restore_existing_data_warning` (+
      RTL), **repurposed**: now positioned after the safety backup
      succeeds (state 4) rather than immediately after existing-data
      detection, and its copy names the safety-backup file as a recovery
      path
   7. Restore Progress — `restore_progress` (existing, copy updated to
      reassure the safety backup remains available)
   8. Restore Success — `restore_success` (existing, unchanged content)
   9. Restore Failure — `restore_failure` (existing, copy updated to
      reassure the safety backup remains available for recovery)
   10. Cancellation without data modification — `restore_cancelled` (+ RTL,
       new) — cancelling before the restore step now produces an explicit,
       visible confirmation that no data was modified, rather than silently
       closing the sheet
   States 7-9 remain LTR-only for now (carried scope from before this pass,
   not a new gap this pass introduces). 12 new screen folders were added to
   `/design/stitch/stitch_elite_real_estate_crm/` (6 LTR + 6 RTL); the
   package grew from 32 to 44 screens.
2. **48dp touch-target gap resolved.** Every icon-only interactive control
   across all 44 screens (back/close buttons, header icon buttons, numeric
   +/- steppers, list-row overflow "more" buttons) now sits inside a 48×48dp
   minimum interactive hit-area, while the **visual icon itself is
   unchanged in size** — the fix expands the invisible tappable bounding
   box (`min-w-[48px] min-h-[48px]` plus centered padding), never the icon
   glyph. Applied at the shared-template level so every screen generated
   from the standard page/sheet shells inherits the fix by construction,
   plus a targeted pass over screens with bespoke icon buttons.
3. **`warning` separated from `error` as a distinct semantic token.**
   `design-tokens.json` and `design-system.md` §12 now define genuine
   `warning`/`on-warning`/`warning-container`/`on-warning-container` tokens
   (amber-family, `#8a5000`/`#ffddb3`/`#6b3d00`), replacing the prior
   arrangement where `warning` was only documented as reusing `error`-family
   tones. `warning` is used for non-fatal caution states (contract
   approaching expiration, reminder-related caution, restore-flow warnings
   before the destructive commit step); `error` is reserved for genuine
   failures (failed operation, invalid input, corrupted data, auth failure,
   unrecoverable/failed state) and for the destructive-commit button itself
   even when the banner above it uses `warning` (e.g. "Restore & Replace").
   Re-colored screens: `contract_management_timeline` (also removed an
   undocumented hardcoded hex `#f57f17`/`#fff8e1` that had no token at all),
   `settings_contract_reminders` (+ RTL), and the restore safety-backup flow
   states 1/2/3/4/6. The existing color palette was not otherwise redesigned
   — this is a semantic re-mapping, not a new visual identity.
4. **Dark mode confirmed still deferred.** No dark-mode colors were
   invented or guessed. `design-tokens.json`'s `color.dark` remains
   `{"$status": "NOT DEFINED..."}"`, unchanged by this pass. Dark mode
   remains a future product/design decision requiring its own dedicated
   palette-design pass.

**Consistency check**: the complete `/design/stitch/` package was searched
for every previously-prohibited product concept (Cloud Sync, Smart
Analysis, AI matching, AES-256, server backup, email alerts, push
notifications, team, brokerage, Global Realty Group, Team Directory) —
**zero matches**, including a word-boundary check on "team" alone.

**Final UI/UX gate**: **READY FOR PHASE 4.** The restore safety-backup flow
is complete (all ten states present, none silently combined), the 48dp
touch-target gap is resolved, `warning`/`error` are now distinct tokens,
and dark mode is explicitly and correctly still deferred rather than
half-implemented. Remaining open items (keyboard focus-ring states,
`aria-label`s on icon-only controls, empty/loading list-screen states) are
implementation-phase markup concerns, not design gaps, and do not block
Phase 4.

**Reason**: Explicit project-owner instruction to correct the one
product-critical UI gap remaining before Phase 4 implementation begins —
restoring onto a device with existing data must never let a user reach the
destructive "replace" confirmation without their current data already
being safely backed up.

**Affected modules**: Documentation
(`/docs/ui/design-system.md`, `/docs/ui/design-tokens.json`,
`/docs/ui/design-system-audit.md`) and the Stitch design package
(`/design/stitch/stitch_elite_real_estate_crm/` — 12 new screen folders,
~30 existing screens' `code.html`/`screen.png` updated for touch targets
and/or warning-token re-coloring). No application code, dependencies, or
database schema were touched. Phase 4 implementation was not started.

**Migration requirements**: None — documentation and design-package only.

**Tests**: None yet (no application code exists). Screenshots for all
new/changed screens were regenerated through the established real-render
pipeline (compiled Tailwind CSS, real fonts, headless Chromium) — none are
placeholders or stale copies.

## 2026-08-08 — Human writing & language quality standard; new content style guide

**What changed**: Established a project-wide language-quality standard so
all user-facing copy (and product documentation) reads as natural,
professional writing rather than machine-generated or literally-translated
text. Created `/docs/ui/content-style-guide.md` as the authoritative
source for terminology, Persian writing rules, punctuation, and
error/confirmation/button-label conventions going forward.

As part of establishing the standard, an editorial pass over the existing
Stitch package found and fixed three genuine issues (not a full rewrite —
the existing copy was largely already sound):

1. `applicant_smart_requirements`: the screen title ("Smart Requirements")
   and description ("Configure the smart matching algorithm... This
   ensures high-precision recommendations") implied AI/algorithmic
   intelligence for what is actually a user-configured, deterministic
   priority list. Retitled to "Applicant Requirements" with copy that
   describes what the feature does without overclaiming.
2. `settings_backup_management`: a progress message read "Encrypting local
   database..." — implementation detail (the word "database") leaking into
   user-facing copy. Changed to "Encrypting your data..."
3. `restore_progress`: a progress message read "Decrypting and writing to
   the local database. Do not close the app." — same technical leak, plus
   an abrupt second sentence. Changed to "Decrypting and applying your
   backup. Please don't close the app while this is running."

The restore safety-backup flow's Persian copy (added in the prior
"FINAL UI correction pass" entry) was reviewed against the new standard
and found already compliant — natural sentence structure, correct ZWNJ
usage, consistent terminology, no literal translation from English.

**Reason**: Explicit project-owner instruction that all user-facing text
must read as if written by an experienced human UX writer, with a durable
style guide so future copy stays consistent rather than drifting screen by
screen.

**Affected modules**: Documentation (`/docs/ui/content-style-guide.md`,
new) and three Stitch screens' `code.html`/`screen.png`
(`applicant_smart_requirements`, `settings_backup_management`,
`restore_progress`). No product logic, design system, or application code
was changed — this pass touched language only.

**Migration requirements**: None — documentation and copy only.

**Tests**: None yet. The three corrected screens were re-rendered through
the established real-render pipeline; screenshots are not stale.

## 2026-08-08 — Phase 4: final architecture and data design

**What changed**: With the UI/UX design system gated READY FOR PHASE 4,
this pass reconciled the full Phase 3 document set against the approved
design system and the actual repository state, closed several previously
deferred architectural gaps with concrete (though still security-review-
pending, where cryptographic) proposals, and produced the documentation
Phase 4 requires before implementation can begin. No application code was
written; the repository remains the unmodified Electron starter scaffold,
as expected at this stage.

Key decisions and documents:

1. **Local database technology finalized.** `ADR-002` moves from PROPOSED
   to **FINAL**: SQLite, independent of the still-open platform choice,
   since SQLite is available as a mature binding on both React Native and
   Capacitor.
2. **Platform decision explicitly flagged as still requiring product-owner
   approval**, not silently finalized. `ADR-001`'s React Native
   recommendation stands, but no approval has been recorded anywhere in
   this document set — restated as **PRODUCT OWNER DECISION REQUIRED** in
   `04-final-architecture.md` and `unresolved-decisions.md`.
3. **Backup encryption scheme designed concretely** for the first time:
   AES-256-GCM (AEAD) + Argon2id (KDF), a two-tier DEK/KEK key hierarchy
   independent of the local database's own key, and a strict
   validation-before-trust order for restore. Documented in the new
   `/docs/architecture/backup-encryption-design.md` and `ADR-004`. Marked
   PROPOSED, pending the dedicated security review the project has
   consistently required before finalizing cryptography — this is that
   review's starting point, not a replacement for it.
4. **Local database at-rest encryption scheme designed concretely**:
   SQLCipher / AES-256, key held exclusively in platform secure storage,
   independent of the backup's own key. Documented in the new `ADR-005`.
   Same PROPOSED status and same caveat as above.
5. **Matching engine extended** with a structured mechanism for
   conditional requirements (e.g. "if the property has a pool, ignore
   bedroom count, floor area, and price") that does not depend on natural-
   language processing — a criterion can name other criteria it suppresses
   when satisfied, evaluated per-candidate within the existing four-stage
   pipeline. Documented in `/docs/matching/matching-architecture.md`. The
   scoring-weight values themselves remain explicitly unresolved, with the
   constraints any eventual values must satisfy now fixed instead.
6. **Conceptual data model extended** with the entities the Phase 4 brief
   named that Phase 3's version left implicit: `PropertyAttributes` and
   `RequirementCriterion` clarified as the same concept the brief calls
   "Applicant Preferences" and "Matching Criteria" (not duplicated as
   separate entities), plus new `ReminderSchedule`, `ApplicationSettings`,
   and a formalized `Notes` entity. A full Owner/Applicant shared field
   model (common / owner-specific / applicant-specific / optional-
   extensible / notes) was added to `/docs/database/conceptual-data-model.md`.
7. **Migration strategy documented for the first time** in the new
   `/docs/architecture/migration-strategy.md`: schema versioning,
   transactional migrations with fail-closed behavior, backup
   compatibility keyed off the same version number, and the governing
   principle that a future app update must never silently destroy
   existing local data. The backup-version support-window policy remains
   a product-owner decision.
8. **Restore safety enforced as an explicit state machine**, added to the
   new `/docs/architecture/04-final-architecture.md` §7 — mapped
   state-for-state to the ten-state UI flow already built and audited in
   the design system, making the "safety backup must succeed before
   replace confirmation, and validation must complete before any write to
   the live database" invariants structurally explicit rather than only
   narratively described.
9. **Threat model extended** with explicit coverage for rooted/jailbroken
   devices, app tampering/repackaging, replay attacks, notification
   lock-screen leakage, and insecure temporary files during restore
   staging — none block the rest of the architecture; all are recorded as
   real, currently open items rather than silently assumed away.
10. **Four new ADRs** recording decisions already implicit elsewhere in
    standard ADR form: `ADR-006` (matching engine), `ADR-007` (local
    notifications), `ADR-008` (offline session lifecycle — the NETWORK
    FAILURE vs. AUTHENTICATION FAILURE rule), and `ADR-009` (authentication
    boundary — the shape of the online surface, distinct from `ADR-003`'s
    narrower OTP-vendor-selection question).

**Reason**: Explicit project-owner instruction to complete Phase 4 —
architecture and data design only, no implementation — now that the UI/UX
design system has passed its final gate.

**Affected modules**: Documentation only
(`/docs/architecture/04-final-architecture.md`,
`/docs/architecture/backup-encryption-design.md`,
`/docs/architecture/migration-strategy.md`,
`/docs/architecture/decisions/ADR-001` through `ADR-009`,
`/docs/database/conceptual-data-model.md`,
`/docs/matching/matching-architecture.md`,
`/docs/security/threat-model.md`,
`/docs/architecture/unresolved-decisions.md`). No application code,
dependencies, or database schema were touched.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Final architecture gate**: **ARCHITECTURE READY WITH PRODUCT DECISIONS
REQUIRED.** See the full final report delivered alongside this entry for
the complete list of what's finalized, what's proposed, and what needs a
product-owner call — the two decisions with the broadest downstream
impact are the mobile platform choice (`ADR-001`) and the backup-version
support window (`migration-strategy.md`).

## 2026-08-08 — Phase 4B: product decisions finalized + dedicated security review

**What changed**: Closed the product-owner decisions Phase 4 left open,
and performed the dedicated cryptographic security review that
`ADR-004`/`ADR-005` had been waiting on since they were first written. No
application code was written; this remains a documentation and
architecture pass.

Four decisions finalized:

1. **Mobile platform: React Native, FINAL.** `ADR-001` re-checked against
   the complete requirement list one last time — no previously
   undocumented blocker surfaced. Capacitor is no longer under
   consideration for this product. The Electron scaffold remains fully
   retired, not adapted, when implementation eventually begins.
2. **Backup version-compatibility window: CURRENT + 2 previous format
   generations, FINAL.** A backup older than that is explicitly rejected,
   never silently attempted. Documented in
   `/docs/architecture/migration-strategy.md`, with a consolidated
   pre-restore validation checklist (format version, encryption metadata,
   integrity/authentication, schema version/migration compatibility,
   required fields) added alongside it.
3. **Referral code reuse policy: immutable after registration, FINAL.** A
   referral relationship is created exactly once, at registration, and
   can never be replaced, removed, or re-attached afterward — enforced
   server-side, with self-referral rejected. Documented in `ADR-009`.
4. **Matching engine scoring model formalized**, without inventing final
   weights, in the new `/docs/architecture/matching-scoring-spec.md`: hard
   vs. soft constraints, five match types (exact, range, approximate,
   categorical, amenity/boolean), explicit handling for missing/
   conflicting/excluded values, conditional-criteria interaction with
   scoring, score normalization (against an applicant's own achievable
   score, not a fixed global maximum), and the full explanation-generation
   content contract. The actual weight numbers remain open, deliberately.

**Dedicated cryptographic security review performed**, documented in the
new `/docs/security/phase-4-security-review.md`. The review confirmed the
core designs in `ADR-004` (AES-256-GCM + Argon2id backup encryption) and
`ADR-005` (SQLCipher/AES-256 local database encryption) are sound —
neither algorithm choice changed — and produced six concrete corrections/
additions, all now folded into `backup-encryption-design.md` §11 and the
two ADRs:

- A specification fix for which header fields each of the two GCM
  operations authenticates (previously ambiguous, not exploitable as
  designed, but worth making precise).
- A requirement that key material (password, KEK, DEK) be handled through
  a native crypto binding capable of explicit memory zeroing, since
  JavaScript's runtime offers no deterministic memory-erasure guarantee.
- **The review's highest-severity finding**: restore/migration staging
  copies of the database were not previously required to be encrypted,
  which could have allowed an implementation to create a genuinely
  plaintext temporary copy of a user's full business data. Now a binding
  requirement — any staged database copy must itself be SQLCipher-
  encrypted, never plaintext, even transiently.
- A requirement to exclude staging/cache paths from OS-level device
  backup (iOS/Android), as defense in depth on top of the encryption
  requirement above.
- A requirement to clean up leftover staging files from a crashed session
  on next app startup.
- A requirement for prototype-pollution-safe, resource-bounded parsing of
  a validated backup payload.

A concrete Argon2id benchmarking procedure was also defined
(`backup-encryption-design.md` §3.1) — the KDF parameters remain PROPOSED
until that procedure is run against a real minimum-supported device,
which itself depends on a still-open minimum-OS-version/device-tier
decision.

The review also walked the restore state machine and the offline/online
session boundary against nine specific adversarial scenarios (attacker
has the device; attacker has only the backup; the backup was modified;
the app crashed mid-restore; the user forgot the password; the app was
reinstalled; the app was offline for a long time; the server reports
authentication failure; the server is unreachable) — all nine held up
against the existing design, with no scenario breaking the
authenticate-before-trust or network-failure-never-logs-out invariants.

**No CRITICAL findings. One HIGH finding (the plaintext-staging gap
above), resolved at the architecture level by this same pass** — the
requirement fixing it is written into the documents already, so it does
not remain open.

**Reason**: Explicit project-owner instruction to close the remaining
Phase 4 product decisions and perform the dedicated security review that
had been consistently deferred until a concrete design existed to review.

**Affected modules**: Documentation only (`ADR-001`, `ADR-004`, `ADR-005`,
`ADR-009`, `backup-encryption-design.md`,
`/docs/architecture/migration-strategy.md`,
`/docs/architecture/matching-scoring-spec.md` (new),
`/docs/security/phase-4-security-review.md` (new),
`/docs/security/threat-model.md`,
`/docs/architecture/unresolved-decisions.md`,
`/docs/database/conceptual-data-model.md`). No application code,
dependencies, or database schema were touched.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Security gate**: **SECURITY GATE PASSED WITH CONDITIONS.** See the full
report delivered alongside this entry — the conditions are the remaining
open items (Argon2id parameter benchmarking, a future implementation-level
crypto review, and the still-open UX-dependent items), none of which are
CRITICAL or unresolved HIGH findings.

## 2026-08-08 — Phase 5: implementation master plan

**What changed**: With the architecture and security design gated
`SECURITY GATE PASSED WITH CONDITIONS`, this pass produced the complete
implementation roadmap — twelve phases (Phase 5 through Phase 16) taking
the project from the current Electron scaffold to a released React
Native application. No application code was written, the Electron
scaffold was not touched, and no production dependency was installed;
this remains a planning pass.

Three documents created:

1. **`/docs/implementation/implementation-roadmap.md`** — Project
   Foundation, Local Database, Security & Cryptography, Authentication &
   Referral, Matching Engine, Contracts & Reminders, UI Foundation,
   Feature UI Implementation, Integration, Testing & Quality, Security
   Audit, and Release Preparation, each with an objective, inputs,
   outputs, expected files, dependencies, security/performance/UX
   considerations, tests, acceptance criteria, and an exit gate. A
   dependency graph identifies exactly two safe parallelization
   opportunities (authentication, matching, and contracts/reminders can
   proceed in parallel once the encrypted database exists; UI foundation
   work can start alongside them) and explicitly declines to recommend
   parallelizing anything else, since every later phase genuinely depends
   on the one before it.
2. **`/docs/implementation/ui-screen-mapping.md`** — every one of the 44
   Stitch screens/states mapped to a React Native screen, route, data
   source, and its loading/empty/error/success behavior. The restore
   safety-backup flow's ten states are mapped directly onto
   `04-final-architecture.md`'s restore state machine, state for state,
   specifically flagged as the highest-risk wiring in the whole mapping.
   Three genuine design gaps were found and documented rather than
   silently designed around: no empty-state pattern yet exists for the
   file list, match results, or contract timeline screens (or a true
   first-run dashboard), and no skeleton/loading-state visual pattern has
   been designed at all — both need a short, focused design addition
   before or during the UI implementation phase.
3. **`/docs/implementation/testing-strategy.md`** — the full test
   taxonomy, a catastrophic-scenario table (corrupted backup, wrong
   password, interrupted restore, insufficient storage, app crash during
   restore, database corruption, failed migration, network failure,
   authentication failure, duplicate reminder, duplicate referral,
   malicious backup — each with its required correct behavior, not just
   "doesn't crash"), a security testing matrix covering backup and
   database confidentiality/integrity, key storage, temporary-file and
   logging leakage, device-compromise behavior, and referral/OTP abuse,
   plus RTL/accessibility and performance testing plans against the
   100/1,000/10,000/50,000-record dataset tiers already established in
   the architecture phase.

**Reason**: Explicit project-owner instruction to produce the complete
implementation roadmap now that architecture and security design have
passed their respective gates, so implementation can begin from a
reviewed plan rather than ad hoc phase-by-phase improvisation.

**Affected modules**: Documentation only
(`/docs/implementation/implementation-roadmap.md`,
`/docs/implementation/ui-screen-mapping.md`,
`/docs/implementation/testing-strategy.md`, all new). No application
code, dependencies, or database schema were touched. The Electron
scaffold remains in place, to be retired at the start of actual Phase 5
execution, not during this planning pass.

**Migration requirements**: None — documentation only.

**Tests**: None yet (no application code exists).

**Implementation plan gate**: **IMPLEMENTATION PLAN REQUIRES DECISIONS.**
The plan itself is complete and internally consistent, but Phase 7
(Security & Cryptography) cannot fully complete without a minimum-
supported-device decision (needed for Argon2id benchmarking), and Phase 9
(Matching Engine) cannot be considered production-ready without the
still-open scoring-weight values — both carried forward from Phase 4B,
not new gaps introduced by this pass. See the full final report delivered
alongside this entry for the complete list.
