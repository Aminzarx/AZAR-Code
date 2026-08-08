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
