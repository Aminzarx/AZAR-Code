# Implementation Roadmap

Status: PROPOSED — the complete implementation plan, built on an
architecture and security design that have already passed their gates
(`ARCHITECTURE READY WITH PRODUCT DECISIONS REQUIRED`,
`SECURITY GATE PASSED WITH CONDITIONS`). This document does not start
implementation. No application code has been written, the Electron
scaffold has not been touched, and no production dependency has been
installed as part of producing this plan.
Date: 2026-08-08

## How to read this document

Each phase below follows the same structure — Objective, Inputs, Outputs,
Files, Dependencies, Security considerations, Performance considerations,
UX considerations, Tests, Acceptance Criteria, Exit Gate — because a
consistent shape makes it possible to check any phase against any other
without re-learning a new format each time. Where a section genuinely
doesn't apply to a given phase (for instance, Phase 5 has no UX surface of
its own), it says so briefly rather than being padded out with filler.

Every phase assumes the ones before it are complete. That's not a
formality — Phase 7 (Security & Cryptography) genuinely cannot be built
correctly against a database that doesn't exist yet (Phase 6), and Phase
12 (Feature UI) genuinely cannot be built against a matching engine or
contract logic that hasn't been implemented (Phases 9-10). Where two
phases can safely overlap, that's called out explicitly in §"Phase
dependency graph" below — it's the exception, not the default.

## Phase numbering note

The project's documentation numbers phases sequentially from Phase 0
(discovery) through Phase 4B (the security gate this roadmap follows).
Implementation continues that numbering starting at Phase 5, matching the
structure requested for this pass. The twelve implementation phases below
correspond to Phases 5 through 16.

---

## PHASE 5 — Project Foundation

### Objective

Replace the current Electron scaffold with a real React Native project
that can build, run, and be tested on both Android and iOS, with the
tooling (TypeScript, linting, formatting, navigation, state management,
CI groundwork) in place before any business logic is written. Nothing in
this phase is product functionality — it's the ground everything else
stands on.

### Inputs

`ADR-001-mobile-platform.md` (FINAL — React Native), the current
repository structure (`src/main`, `src/renderer`, `src/preload`,
`electron-builder.yml`, `electron.vite.config.ts`).

### Outputs

A working, empty-but-real React Native application: it launches on an
Android emulator and an iOS simulator, shows a placeholder screen, has
TypeScript configured in strict mode, has navigation wired up with no
routes yet beyond a placeholder, has a state-management pattern chosen
and demonstrated with one trivial example, and has linting/formatting
enforced via a pre-commit or CI check.

### Files

- New: `app/` or equivalent RN project root (exact layout follows RN's
  standard project structure, not this document's invention), `package.json`
  targeting RN dependencies, `tsconfig.json` in strict mode,
  `.eslintrc`/`eslint.config.*`, Prettier config (carrying forward the
  existing `.prettierrc.yaml`/`.editorconfig` conventions where they still
  apply to a JS/TS codebase), `android/`, `ios/` native project folders.
- Retired, not migrated: `src/main`, `src/preload`,
  `electron-builder.yml`, `electron.vite.config.ts`, and everything else
  specific to the Electron shell. Per `ADR-001`'s consequences section,
  this is a full retirement, not an adaptation — nothing in the current
  `src/renderer/src/` is product code (it's the unmodified starter demo,
  per Phase 0 §5), so there's no real business logic being discarded.

### Dependencies

React Native CLI (or the current recommended RN tooling at implementation
time), TypeScript, a navigation library (React Navigation is the
de facto standard for RN and is assumed here unless a documented reason
emerges to deviate), a state-management approach appropriate for an
offline-first app — most of this application's "state" is actually
database state, not client state, so a heavy global-store library (Redux
with extensive middleware, for instance) is likely more machinery than
this app needs; a lighter approach (React Query or equivalent for
data-fetching/caching semantics over the local repository layer, plus
React's built-in state for pure UI state) fits the actual shape of the
problem better. This is a recommendation for Phase 5 to validate, not a
decision this document is making unilaterally — if Phase 5's own
experience says otherwise once real screens exist, that's exactly the
kind of implementation-phase finding `unresolved-decisions.md` exists to
capture.

### Security considerations

None specific to this phase — no business data, no cryptography, no
network calls exist yet. The one forward-looking concern: project
structure should keep a clean boundary between the future UI layer and
the future Local Application Core (matching engine, contract logic,
backup orchestration) from the start, per `ADR-001`'s consequences
section, so security-sensitive code isn't scattered across UI components
later.

### Performance considerations

Cold-start baseline should be measured on a real low-end device as soon
as the placeholder app exists, before any feature weight is added — this
gives every later phase an honest baseline to compare against rather than
discovering in Phase 14 that the app was already slow before any business
logic existed.

### UX considerations

None — no product UI exists in this phase.

### Tests

- Unit: a trivial test confirming the test runner itself works (Jest or
  equivalent), so later phases inherit a working test harness instead of
  debugging test infrastructure while also trying to write real tests.
- Integration/E2E: the app launches and renders its placeholder screen on
  both platforms — this is the phase's only meaningful "test," since
  there's no feature to test yet.

### Acceptance Criteria

- App builds and runs on Android and iOS.
- TypeScript strict mode has zero errors.
- Linting and formatting run cleanly and are wired into a pre-commit hook
  or CI check.
- The Electron scaffold is fully removed from the active project (may be
  kept in version-control history, not left half-present alongside the
  new RN project).

### Exit Gate

A clean `git` checkout of the branch builds and runs the placeholder app
on both platforms with no manual setup steps beyond documented ones (an
`README` or setup doc, not tribal knowledge).

---

## PHASE 6 — Local Database

### Objective

Stand up SQLite (`ADR-002`, FINAL) as the application's data layer, with
the schema derived from `conceptual-data-model.md`, a migration system in
place from the very first schema version (not retrofitted later), and a
repository/data-access layer that is the *only* thing in the codebase
allowed to run SQL — the UI never touches SQLite directly, per this
phase's core architectural rule.

### Inputs

`ADR-002-local-database-source-of-truth.md`,
`/docs/database/conceptual-data-model.md`,
`/docs/local-data/local-data-architecture.md`,
`/docs/architecture/migration-strategy.md`, Phase 5's project foundation.

### Outputs

A working SQLite database (not yet encrypted — encryption is Phase 7,
deliberately sequenced after the schema exists, so encryption wraps a
real, tested database rather than being designed against a hypothetical
one) with every entity from the conceptual data model represented as
actual tables, a migration runner that can take the database from schema
version 0 to the current version and is exercised by a real test, and a
repository layer exposing typed methods (e.g. `OwnerFileRepository.create()`,
`.findById()`, `.search()`) rather than raw SQL strings anywhere outside
that layer.

### Files

- New: a `database/` or `data/` module containing the schema definition,
  migration scripts (one file per version, per `migration-strategy.md`'s
  versioning rule), and a `repositories/` subdirectory with one repository
  per major entity (`OwnerFileRepository`, `ApplicantFileRepository`,
  `RequirementCriterionRepository`, `ContractRepository`,
  `ReminderRepository`, `MatchRepository`, `BackupMetadataRepository`,
  `AuditLogRepository`, `ApplicationSettingsRepository`).

### Dependencies

An RN SQLite binding (selected against React Native specifically, now
that `ADR-001` is FINAL — a binding with active maintenance and a real
production track record, evaluated at implementation time rather than
locked in by this document, since binding churn in the RN ecosystem is
common enough that naming one here risks being stale by the time Phase 6
starts). Phase 5's project foundation.

### Security considerations

None yet at the encryption level (Phase 7 adds that) — but the
**architectural boundary** this phase establishes (UI never touches
SQLite directly) is itself a security-relevant decision: it means every
future access-control or validation rule has exactly one place to live
(the repository layer), not many scattered call sites. Foreign key
constraints must be enabled and enforced from the first migration, per
`local-data-architecture.md`'s integrity requirements — not added later
as a cleanup pass.

### Performance considerations

Indexes named in `conceptual-data-model.md` §"Indexing considerations"
and `04-final-architecture.md` §9 are created in the same migration that
creates their tables, not bolted on afterward. Query patterns for list
views (paginated, not "fetch everything") are established here as the
default pattern, since retrofitting pagination after screens are built
against an unpaginated repository method is much more disruptive than
building it in from the start.

### UX considerations

None directly — this phase has no UI. Its output (a working, queryable
repository layer) is what Phase 12's screens will eventually bind to.

### Tests

- Unit: repository methods tested against an in-memory or temporary
  SQLite instance — create/read/update/delete for every entity, including
  constraint violations (e.g. a `Reminder` insert violating the
  `(contract_id, offset)` unique constraint fails as expected).
- Integration: the full migration chain runs from version 0 to current on
  a fresh database, and separately on a database seeded at an
  intermediate version, confirming both paths produce an identical final
  schema.
- Migration tests: a deliberately failing migration (simulated) leaves the
  database at its prior version, per the transactional-migration
  requirement in `migration-strategy.md`.

### Acceptance Criteria

- Every entity in `conceptual-data-model.md` has a corresponding table and
  repository.
- No SQL string exists anywhere outside the `database/`/`data/` module.
- Foreign keys and unique constraints (especially `Reminder`'s
  `(contract_id, offset)`) are enforced at the database level, verified by
  a failing test if violated.
- The migration runner is exercised by an automated test, not just
  manually verified once.

### Exit Gate

A repository-layer integration test suite passes against a real (not
mocked) SQLite instance, covering every entity's basic CRUD and the
migration chain.

---

## PHASE 7 — Security & Cryptography

### Objective

Implement the two cryptographic subsystems `ADR-004`
(backup encryption) and `ADR-005` (local database encryption) designed in
Phase 4B, wrap Phase 6's plain SQLite database in SQLCipher, and build the
backup create/validate/restore pipeline's cryptographic core —
independent of the UI that will eventually drive it (Phase 12).

### Inputs

`ADR-004-backup-encryption.md`, `ADR-005-local-database-encryption.md`,
`/docs/architecture/backup-encryption-design.md`,
`/docs/security/phase-4-security-review.md`, Phase 6's database and
repository layer.

### Outputs

The Phase 6 database now opened through SQLCipher, with its key generated
on first launch and held exclusively in platform secure storage. A backup
module that can create an encrypted, authenticated backup file from the
live database, and separately validate and decrypt one, following the
exact six-step (now five-point-checklist, per `migration-strategy.md`)
validation order — implemented as its own testable unit, not entangled
with restore's UI flow. A native-crypto-binding-based key-handling layer
satisfying the Phase 4B review's zeroization requirement.

### Files

- New: a `crypto/` or `security/` module containing key generation/
  storage wrappers (secure-storage bindings for iOS Keychain/Android
  Keystore), the AES-256-GCM/Argon2id backup encryption implementation,
  and the SQLCipher database-open wrapper. A `backup/` module containing
  backup-file read/write logic built on top of `crypto/`.
- Modified: Phase 6's database-open code path now routes through the
  SQLCipher wrapper instead of opening a plain SQLite connection.

### Dependencies

A native (not pure-JS) AES-GCM and Argon2id binding — per the Phase 4B
review's explicit requirement (`backup-encryption-design.md` §11.2) — a
SQLCipher-compatible RN SQLite binding (this may be the same library
selected in Phase 6, if it supports SQLCipher, or may require swapping to
one that does; this should be decided in Phase 6 with Phase 7 already in
mind, so the two phases don't end up needing an incompatible library
swap), and platform secure-storage bindings for both iOS and Android.

### Security considerations

This entire phase *is* the security considerations. Specific
implementation requirements carried forward from the Phase 4B review,
restated here as concrete build tasks rather than repeated analysis:

- The Argon2id benchmarking procedure (`backup-encryption-design.md`
  §3.1) must be run against a real representative low-end device **before**
  the KDF parameters used in this phase's code are treated as final —
  this is a **[PRODUCT OWNER DECISION REQUIRED before this phase can
  fully complete]** dependency on choosing a minimum-supported-device
  baseline.
- Any staged/temporary database copy this phase's backup or restore code
  creates must be SQLCipher-encrypted, never plaintext, per
  `backup-encryption-design.md` §11.3 — this is not optional
  defense-in-depth, it's a build requirement with a test attached (see
  Tests below).
- Staging/cache directories must be excluded from OS-level device backup
  (§11.4) — implemented via the platform-specific exclusion APIs named in
  that section.
- A startup routine that sweeps leftover staging files from a
  non-terminated prior session (§11.5).
- Logging in this module must never emit the password, KEK, DEK, or any
  derived key material — enforced by code review discipline and, where
  possible, a lint rule or test that scans for accidental secret logging.

### Performance considerations

Argon2id's cost is deliberately significant (§3 of the design doc) —
this phase must ensure that cost doesn't block the UI thread; the
derivation should run off the main/JS thread (native module execution
context) so the app doesn't appear frozen during a backup password
operation. SQLCipher's page-level encryption overhead on ordinary query
performance should be measured against Phase 6's baseline queries, not
assumed negligible.

### UX considerations

None directly implemented in this phase (that's Phase 12), but this
phase's API surface must be shaped to support the UI states already
designed for the restore safety-backup flow (`design-system.md` §8.22) —
distinct, awaitable operations for "create safety backup," "verify safety
backup," "validate incoming backup," "restore," and "validate restored
data" — not one monolithic "do everything" function, so Phase 12 can
drive each of the ten UI states independently.

### Tests

- Unit: encryption/decryption round-trip; tampered-header detection;
  wrong-password detection distinguishable from corruption; every failure
  mode in `backup-encryption-design.md` §9's table produces its
  corresponding, distinct error.
- Security tests: a test that deliberately creates a staging file during a
  simulated backup/restore operation and asserts it is SQLCipher-encrypted
  (not plaintext) on disk at every point during the operation — this is
  the direct, automated verification of the Phase 4B review's HIGH-severity
  finding's fix, and should fail loudly if a future change regresses it.
  A test confirming no secret value appears in captured log output across
  a full backup/restore cycle.
- Integration: a full backup-then-restore cycle against a real (encrypted)
  Phase 6 database, confirming the restored data matches the original.

### Acceptance Criteria

- The live database is SQLCipher-encrypted; opening it without the
  correct key fails.
- A backup created by this phase's code passes its own validation
  pipeline when restored.
- The staging-encryption test (above) passes.
- No secret value appears in logs across the test suite's full run.

### Exit Gate

The security-test subset described above passes, and a manual (or
automated, if feasible this early) confirmation that a backup file
extracted from a test device and inspected with a hex editor / file tool
shows no readable business data.

---

## PHASE 8 — Authentication & Referral

### Objective

Implement the online authentication boundary (`ADR-009`) — the only part
of this application that talks to a network — as a small, isolated
module with a provider-agnostic OTP interface (per `ADR-003`), correctly
implementing the NETWORK FAILURE vs. AUTHENTICATION FAILURE distinction
(`ADR-008`) from the start, not as a later hardening pass.

### Inputs

`ADR-009-authentication-boundary.md`, `ADR-008-offline-session-lifecycle.md`,
`ADR-003-otp-provider-deferred.md`,
`/docs/security/authentication-otp-architecture.md`, Phase 7's secure
storage bindings (for session credential storage).

### Outputs

A working registration flow (mobile number → OTP → referral code → server
validation → local session) against a backend that, for this phase's
purposes, may be a lightweight stub/mock implementing the same API
contract a real backend will — since backend implementation is a
separate, server-side effort not covered by this mobile-focused roadmap,
but the mobile app's contract with it must exist and be testable. A
session-management module implementing `ADR-008`'s table exactly: network
failure never ends a session; only an explicit, server-confirmed
authentication failure does.

### Files

- New: an `auth/` module containing the API client (with its own
  isolated network boundary, not a general-purpose HTTP client used
  elsewhere in the app — this app should have exactly one thing that
  talks to a network, and this module is it), OTP flow state management,
  referral-code entry/validation flow, and session storage (via Phase 7's
  secure-storage bindings).

### Dependencies

An HTTP client library, Phase 7's secure-storage module, a backend API
contract (even if the backend itself is stubbed for this phase — the
contract must be defined, likely as a small OpenAPI-style spec, so mobile
and backend work can proceed independently once it exists).

### Security considerations

- Referral immutability (`ADR-009`) is enforced server-side, but the
  client must not present a UI or code path suggesting a referral can be
  changed post-registration — the client and server should agree on this
  invariant, not just the server.
  Rate limiting, retry limits, and abuse prevention live server-side per
  `ADR-009` — this phase's mobile client role is "submit a request,
  display the result," never "decide whether this is allowed," and the
  client-side code should reflect that discipline literally (no
  client-side logic that second-guesses or bypasses a server rejection).
- Session credentials are stored via Phase 7's secure-storage bindings,
  never in plain app storage.
- Timeout and retry policy: a bounded number of retries with backoff for
  transient network issues, distinct from treating a timeout as an
  authentication failure (it's a NETWORK FAILURE, per `ADR-008`).

### Performance considerations

Registration/login are low-frequency actions; performance here is about
not blocking the UI thread during network calls and giving honest,
immediate feedback (loading states) rather than raw throughput.

### UX considerations

Maps directly to `authentication_phone_entry`, `authentication_otp_verification`,
`authentication_referral_code` in the Stitch package
(`ui-screen-mapping.md` covers the full binding). The "no connectivity"
error state (AUTH-06/REF-06 from Phase 2's user stories) must be visually
and behaviorally distinct from a rejected/invalid submission — this was
an explicit design requirement carried since Phase 1/2 and must not be
collapsed into one generic error state during implementation.

### Tests

- Unit: OTP flow state transitions, referral validation client-side
  request shaping (not business-rule enforcement, which is server-side).
- Integration: full registration flow against the stub backend, including
  a simulated network-failure-mid-flow case, confirming the app doesn't
  crash or corrupt local state.
- Security tests: a simulated "session invalid" server response correctly
  ends the local session; a simulated timeout/5xx/unreachable-server
  response does *not* end the session — this is the single most
  important test in this phase, directly verifying `ADR-008`'s policy.

### Acceptance Criteria

- Registration and login work end-to-end against the stub backend.
- The NETWORK FAILURE vs. AUTHENTICATION FAILURE test (above) passes.
- No business-data functionality is gated behind this module being online
  — verified by confirming Phase 6/7's repository and backup code paths
  have zero dependency on this module.

### Exit Gate

The session-lifecycle test suite passes, including the network-failure
and authentication-failure branches, and a manual test confirms the app
remains fully usable for local data (once authenticated) with the device
in airplane mode.

---

## PHASE 9 — Matching Engine

### Objective

Implement the deterministic, four-stage matching engine
(`ADR-006-matching-engine.md`, `matching-scoring-spec.md`) as
platform-independent TypeScript, fully unit-testable without a UI, a
database, or a device — pure logic operating on structured inputs and
producing structured, explainable outputs.

### Inputs

`ADR-006-matching-engine.md`, `/docs/matching/matching-architecture.md`,
`/docs/architecture/matching-scoring-spec.md`, Phase 6's `RequirementCriterion`/
`PropertyAttributes` schema (the engine's actual input shape).

### Outputs

A `matching/` module exposing a pure function (or small set of functions)
implementing Stage 1 (hard-constraint filter) → Stage 2 (per-criterion
evaluation) → Stage 3 (weighted scoring) → Stage 4 (explanation assembly),
runnable in both directions (applicant→properties, property→applicants),
with conditional-criteria suppression implemented per
`matching-architecture.md`'s design. Weight values are **not** invented in
this phase — see Security/product note below.

### Files

- New: `matching/` module with clearly separated files per stage (or a
  clear internal separation within fewer files, as long as each stage is
  independently testable), a `matching-weights.ts`-style configuration
  file holding weight values as data (not hardcoded inline constants),
  intentionally left as placeholder/test values pending the still-open
  product decision below.

### Dependencies

None beyond Phase 6's schema shape (the engine reads `RequirementCriterion`
and `PropertyAttributes`-shaped data, but should not depend on the
repository layer directly — it should accept already-fetched data and
return results, keeping it testable without a database).

### Security considerations

No AI dependency, anywhere in this module — this is not just a
constraint to honor but something worth a specific test asserting no
network call or AI-service import exists in this module's dependency
tree, so a future accidental dependency addition is caught by CI, not
discovered later.

### Performance considerations

Stage 1's filtering should be structured so it *can* be pushed into a SQL
`WHERE` clause when called from the repository layer (Phase 6) for large
datasets, per `04-final-architecture.md` §9 — this phase's pure-function
core can be tested with in-memory arrays, but its design must not assume
"just filter an array in application code" is always how Stage 1 runs in
production; the repository layer integration (this phase produces the
matching logic, a later integration step in Phase 13 wires it to
SQL-level pre-filtering for large datasets).

### UX considerations

The explanation structure this phase produces (matched/partially-matched/
mismatched/ignored/conditionally-suppressed/critical-satisfied, per
`matching-scoring-spec.md` §"Explanation generation") is exactly what
`matching_ranked_results` and `smart_matching_match_analysis_persian_rtl`
need to render — this phase's output contract should be designed with
those two screens' actual data needs in mind, not as an abstract data
structure designed in isolation.

### Tests

Explicit test categories, matching the brief's request precisely: exact
matches, range matches, partial/approximate matches, missing values,
`MUST_HAVE` failures (hard-filter exclusion), `IMPORTANT` scoring
contribution, `PREFERRED` scoring contribution, `IGNORE` (verified as
genuinely skipped, not scored as zero), `Restriction`/exclusion handling,
conditional criteria (the "if pool, ignore bedrooms/area/price" case,
verified both when the condition holds and when it doesn't), location
matching, amenity/boolean matching, and conflicting-criteria handling
(verified as rejected at the data-entry boundary, per
`matching-scoring-spec.md`, not something this engine has to interpret).

### Acceptance Criteria

- Every test category above has passing tests.
- **[PRODUCT OWNER DECISION REQUIRED, or data-driven tuning]**: this
  phase cannot be considered feature-complete for production weights
  until `matching-scoring-spec.md`'s open items (exact `IMPORTANT`/
  `PREFERRED` weight values, tolerance bands, normalization scale) are
  resolved — this phase's acceptance criteria for *architecture
  correctness* (the pipeline, the priority semantics, explainability) can
  be met with placeholder weights; acceptance for *production readiness*
  cannot, and this distinction should not be blurred when this phase is
  marked "done."
- No AI/network dependency exists in this module (verified by the
  dependency-tree test above).

### Exit Gate

The full test-category suite passes against placeholder weights, and the
module's public API is stable enough for Phase 12's UI to bind against
without expecting further shape changes (only weight-value changes,
which shouldn't require an API change if weights are data, not code).

---

## PHASE 10 — Contracts & Reminders

### Objective

Implement contract lifecycle management and the reminder/local-
notification system (`ADR-007-local-notifications.md`), including the
idempotency guarantee, device-restart recovery, and the fixed default
offset schedule (90/60/30/14/7/3/On Expiration).

### Inputs

`ADR-007-local-notifications.md`,
`/docs/notifications/notification-architecture.md`, Phase 6's `Contract`/
`Reminder`/`ReminderSchedule`/`Notification` schema.

### Outputs

Contract CRUD (create, edit, delete) wired through Phase 6's repository
layer; a reminder-evaluation routine that generates `Reminder` records
per the idempotent `(contract_id, offset)` model; local-notification
scheduling wired to the platform's notification APIs; a startup routine
that re-derives and re-schedules outstanding notifications by comparing
`Reminder` records against what the OS currently has scheduled.

### Files

- New: a `contracts/` module (contract CRUD, expiration calculation) and
  a `reminders/` module (schedule evaluation, notification scheduling,
  device-restart recovery routine).

### Dependencies

A local-notification scheduling library for React Native, Phase 6's
repository layer.

### Security considerations

Notification content visibility on the lock screen (§"Notification
leakage" in `threat-model.md`) is implemented here — this phase should
default to a conservative, generic notification text ("Contract
reminder") rather than exposing tenant/owner names or addresses on a
locked device, pending the still-open UX decision on whether full detail
is ever shown pre-unlock.

### Performance considerations

Reminder evaluation is a lightweight per-contract check backed by an
indexed lookup (Phase 6) — this phase should confirm that evaluating
reminders for a realistic contract count (hundreds, per
`04-final-architecture.md`'s performance tiers) doesn't introduce a
noticeable delay on app startup, where this evaluation is likely to run.

### UX considerations

Maps to `contract_management_timeline`, `settings_contract_reminders`
(+RTL), and the reminder-severity color coding (`warning` token, per the
UI correction pass) that this phase's contract-status/expiration logic
must feed accurate data into — the UI's "3 Days Left" style badges are
only as correct as this phase's date-calculation logic.

### Tests

- Unit: reminder generation for a contract crossing each offset boundary;
  duplicate-generation prevention (running evaluation twice produces no
  duplicate `Reminder` rows — a direct test of the unique-constraint
  idempotency mechanism); calendar-date-based (not timezone-instant-based)
  offset calculation, including a simulated device-timezone change.
- Integration: notification-permission-denied path still creates the
  in-app history entry (NOTIF-03); a simulated device restart correctly
  re-derives outstanding notification scheduling without duplicating.
- Catastrophic-scenario tests (contributing to Phase 14's broader
  catalogue): a reminder-schedule-configuration change applied after some
  reminders have already fired doesn't retroactively refire them.

### Acceptance Criteria

- All seven default offsets fire correctly for a test contract.
- The idempotency test passes under a simulated concurrent-evaluation
  race (two evaluation calls in quick succession produce one `Reminder`
  row, not two).
- Device-restart recovery is verified by an automated test that clears
  simulated OS-level scheduled notifications and confirms the app
  restores them from `Reminder` records on next launch.

### Exit Gate

The reminder idempotency and device-restart-recovery tests pass, and a
manual test confirms a real local notification fires on a test device at
its scheduled time.

---

## PHASE 11 — UI Foundation

### Objective

Translate `/docs/ui/design-tokens.json` and `/docs/ui/design-system.md`
into a real, reusable React Native component library and theming system —
the foundation Phase 12's actual feature screens are built from, so no
screen invents its own spacing, color, or typography values inline.

### Inputs

`/docs/ui/design-tokens.json`, `/docs/ui/design-system.md`,
`/docs/ui/content-style-guide.md`, Phase 5's navigation/state foundation.

### Outputs

A theme object (or equivalent RN styling mechanism) encoding every token
in `design-tokens.json` — colors (including the now-distinct `warning`
token), typography scale (LTR and RTL variants), spacing, radius,
elevation, icon sizes, motion durations — plus a base component library
implementing the design system's component specs (§8 of
`design-system.md`): buttons, icon buttons (with the corrected 48dp hit
area baked in structurally, not left to each screen to remember), text
fields, chips, cards, bottom sheets, list rows, priority chips. RTL
support (Vazirmatn font loading, layout mirroring, directional-icon
mirroring rules) is built into this foundation, not treated as a later
pass.

### Files

- New: a `theme/` or `design-system/` module (token definitions, theme
  provider), a `components/` library (the base component set above), font
  assets (Geist, Inter, Vazirmatn, Material Symbols).

### Dependencies

Phase 5's navigation setup, a font-loading mechanism for RN, an icon
library compatible with Material Symbols Outlined (or an equivalent
approach that preserves the design system's icon semantics — outline-only,
`FILL` state reserved for active navigation).

### Security considerations

None specific to this phase.

### Performance considerations

Font loading and theme initialization happen once at startup and should
be measured against the Phase 5 cold-start baseline — a heavy font-loading
step is a common, avoidable source of startup regression.

### UX considerations

This phase **is** UX implementation — the entire point is that every
token and component matches `design-system.md` exactly, with zero
deviation unless a documented defect is found (per this phase's control
rule: do not redesign, only implement what's already approved). The
48dp touch-target correction and the `warning`/`error` token separation
(both finalized in the UI correction pass) must be present in the base
component library from the start — implementing icon buttons at 40dp and
"fixing it later" would repeat the exact defect that correction pass
already closed once.

### Tests

- Unit: theme token values match `design-tokens.json` exactly (a
  snapshot/equality test against the JSON file itself, so token drift
  between the design system and the implementation is caught
  automatically, not by manual comparison).
- Visual/accessibility: touch-target size assertions on every icon-button
  component instance (48×48dp minimum, verified programmatically where
  the testing tooling allows).
- RTL tests: a representative screen renders correctly mirrored in RTL
  mode with Vazirmatn loaded, Persian digits in prose context, and Western
  digits in currency/phone context.

### Acceptance Criteria

- Every token in `design-tokens.json` has a corresponding implementation
  value, verified by the snapshot test.
- Every base component matches its `design-system.md` §8 specification.
- RTL rendering is verified working before any Phase 12 screen is built
  on top of this foundation — per the explicit instruction not to build
  LTR first and fix RTL later.

### Exit Gate

The token-parity test and the touch-target test both pass, and one
representative screen (not yet a real feature screen — a foundation
smoke-test screen) renders correctly in both LTR and RTL.

---

## PHASE 12 — Feature UI Implementation

### Objective

Build every one of the 44 Stitch screens/states as real React Native
screens, bound to Phases 6-10's actual data and logic (repository layer,
matching engine, contract/reminder logic, backup/restore pipeline) —
using `/docs/implementation/ui-screen-mapping.md` as the authoritative,
screen-by-screen build checklist.

### Inputs

`/docs/implementation/ui-screen-mapping.md` (produced alongside this
roadmap), Phase 11's component library, Phases 6-10's business logic.

### Outputs

Every screen mapped in `ui-screen-mapping.md` exists as a real, navigable
RN screen, wired to real data (not mock data) wherever Phases 6-10
already provide it, with loading/empty/error/success states implemented
per the mapping document, not just the "happy path."

### Files

A `screens/` directory (or feature-module-scoped screen directories,
depending on the navigation architecture chosen in Phase 5) with one
entry per screen in the mapping document, plus any screen-specific
components that don't belong in Phase 11's shared library.

### Dependencies

Phases 6-11, complete.

### Security considerations

The restore safety-backup flow's ten screens (`ui-screen-mapping.md`'s
restore rows) must be wired to Phase 7's backup module's distinct,
awaitable operations exactly as designed — each UI state corresponds to a
real operation boundary, not a UI-only "pretend step" with no
corresponding backend guarantee. This is the single place in Phase 12
where getting the UI-to-logic wiring wrong would silently reintroduce the
exact restore-safety gap the UI correction pass and the architecture
phases spent significant effort closing.

### Performance considerations

List screens (`file_management_all_files`, `matching_ranked_results`,
`contract_management_timeline`) must use the paginated repository methods
from Phase 6, not "fetch everything and filter client-side" — this is the
phase where Phase 6/9's performance-conscious design either gets honored
or gets undermined by a shortcut; per `04-final-architecture.md` §8, this
should be validated against the 1,000 and 10,000-record test datasets
before this phase is considered done for those specific screens.

### UX considerations

No redesign — implement exactly what `design-system.md`,
`design-tokens.json`, and the Stitch screens specify. If an
implementation-time conflict is discovered (a screen's design doesn't
account for a real data shape, for instance), the project's control rule
applies: stop, document the conflict, identify the affected requirement,
propose alternatives, and wait for approval — do not invent new UI
behavior to route around it silently.

### Tests

- Component tests for each screen's loading/empty/error/success states.
- Integration tests binding real screens to Phases 6-10's real logic
  (not mocked) for at least the highest-risk flows: restore safety-backup
  (all ten states), matching results display, contract reminder display.
- RTL tests for every screen that has an RTL counterpart in the Stitch
  package.

### Acceptance Criteria

Every row in `ui-screen-mapping.md` is checked off — screen exists,
routes correctly, binds to real data, and implements every state the
mapping document specifies for it.

### Exit Gate

A full manual walkthrough of the app (not just automated tests) covering
every primary user flow — file management, matching, contracts/reminders,
backup/restore, settings — completes without a broken screen, a missing
state, or a design-system deviation.

---

## PHASE 13 — Integration

### Objective

Wire every previously-independent module together into one coherent
application, resolve the seams between phases that were deliberately
built in isolation (the matching engine's pure-function core meeting
Phase 6's SQL-level pre-filtering; the auth module's session state gating
navigation; the backup module's operations driving Phase 12's restore UI
end-to-end), and validate the whole system behaves as one product, not a
collection of correctly-functioning parts that don't quite fit.

### Inputs

Phases 6-12, complete.

### Outputs

A single, integrated application where: opening the app checks session
state and routes accordingly; the matching engine's Stage 1 filtering
is actually pushed into repository-layer SQL queries for real
performance, not just tested as an in-memory function; the full restore
state machine (`04-final-architecture.md` §7) runs end-to-end against
real backup files, real staging, and a real atomic swap; reminders
generated by Phase 10 actually produce visible in-app history and real OS
notifications reachable from Phase 12's settings screens.

### Files

No major new modules — this phase is primarily about the connective code
between existing modules, plus fixing whatever seam issues integration
surfaces.

### Dependencies

All previous phases.

### Security considerations

This is the first point at which the full restore state machine can be
tested truly end-to-end (real encrypted files, real staging, real atomic
swap on a real filesystem) rather than each piece tested in isolation —
treat this as a required, not optional, validation step before Phase 14's
broader test pass, since integration is exactly where the Phase 4B
review's "same filesystem volume" assumption (§8 of
`phase-4-security-review.md`) gets its first real check.

### Performance considerations

This is where Phase 9's matching engine and Phase 6's SQL pre-filtering
actually get connected — the performance targets in
`04-final-architecture.md` §8 can only be meaningfully measured once this
connection is real, since a matching engine tested only against small
in-memory arrays in Phase 9 doesn't tell you how it performs against
50,000 real, indexed rows.

### UX considerations

Cross-screen navigation flows (e.g. completing registration and landing
on the dashboard; completing a restore and returning to settings) are
validated here as coherent journeys, not just individually correct
screens.

### Tests

- End-to-end tests covering full user journeys spanning multiple modules:
  register → create an owner file → create an applicant file → run a
  match → view the explanation; create a contract → advance the clock
  (simulated) → confirm a reminder fires; create a backup → wipe local
  state → restore → confirm data integrity.
- Performance tests against the 100/1,000/10,000/50,000-record datasets
  (per `04-final-architecture.md` §8), now meaningful because the full
  stack is connected.

### Acceptance Criteria

Every end-to-end journey above completes successfully on both platforms,
and the performance tests meet or explain any deviation from
`04-final-architecture.md`'s targets (a target not yet met should be
logged as a specific, named risk carried into Phase 14, not silently
waived).

### Exit Gate

The end-to-end test suite passes on both Android and iOS, and the
performance-test results are recorded (met, or explicitly flagged as a
tracked gap) against every dataset tier.

---

## PHASE 14 — Testing & Quality

### Objective

Run the complete testing strategy defined in
`/docs/implementation/testing-strategy.md` (produced alongside this
roadmap) as a dedicated phase — not because no tests exist before this
point (every phase above has its own test requirements), but because this
is where catastrophic-scenario testing, cross-cutting accessibility/RTL
verification, and broader device-matrix testing happen as their own
focused effort rather than being squeezed into feature phases.

### Inputs

`/docs/implementation/testing-strategy.md`, the fully integrated
application from Phase 13.

### Outputs

A test report covering every category in the testing strategy document,
with every catastrophic scenario (corrupted backup, wrong password,
interrupted restore, insufficient storage, app crash during restore,
database corruption, failed migration, network failure, authentication
failure, duplicate reminder, duplicate referral, malicious backup) verified
against the real, integrated application, not just unit-tested in
isolation.

### Files

Test suites and fixtures across the codebase; a test report document
(not necessarily version-controlled documentation — likely CI output, but
summarized in the phase's closing record).

### Dependencies

Phase 13, complete.

### Security considerations

The security test matrix (`testing-strategy.md` §"Security testing
matrix") is executed here in full against the real application, not just
the isolated Phase 7 crypto tests — this is where backup confidentiality,
key-extraction resistance, and temp-file-leakage tests run against actual
device storage, not simulated conditions.

### Performance considerations

Cold start, warm start, and every other performance target from
`04-final-architecture.md` §8 is measured on real representative
hardware, not just a development machine or simulator — simulators
routinely misrepresent real-device performance, especially for
cryptographic operations and large-list rendering.

### UX considerations

Accessibility testing (screen-reader labels, focus order, contrast —
per `design-system.md` §20's checklist) and RTL testing across the full
app (not just individual screens) both happen here as dedicated passes.

### Tests

This phase *is* the tests — see `testing-strategy.md` for the full
breakdown by category.

### Acceptance Criteria

Every catastrophic scenario in the testing strategy's list has a passing
test demonstrating correct, safe behavior (data preserved, clear error
shown, no partial state) — not just "doesn't crash."

### Exit Gate

The full test suite (unit, integration, E2E, security, performance,
accessibility, RTL) passes, with any known gaps explicitly documented as
named risks, not silently accepted.

---

## PHASE 15 — Security Audit

### Objective

An independent security audit of the *implementation* — distinct from
the Phase 4B review, which audited the *design*. This is the review
`ADR-004` and `ADR-005` have been waiting on since Phase 4B explicitly
deferred it: "a review of the actual implementation, once code exists."

### Inputs

The complete, integrated, tested application from Phase 14;
`/docs/security/phase-4-security-review.md` as the baseline the
implementation should be checked against.

### Outputs

A security audit report (structured the same way
`phase-4-security-review.md` was: findings, severity, mitigations,
residual risks) covering the actual code — verifying every requirement
that review wrote into the design (encrypted staging, native-binding key
zeroization, OS-backup exclusion, crash-remnant cleanup, parser safety,
the AAD-scope correction) was actually implemented as specified, not just
designed correctly and then implemented differently.

### Files

A new audit report document, likely
`/docs/security/phase-15-implementation-security-audit.md` (not created by
this roadmap — this is Phase 15's own deliverable, produced when that
phase runs).

### Dependencies

Phase 14, complete.

### Security considerations

This phase's entire purpose is security review — it should use
`/ai-generated-code-security-auditor`, `/security-architect`, and
`/penetration-tester` (or their real-world equivalents, if this is
executed by a human security team rather than these tool personas) as
named in the brief, specifically because a design review and a code
review catch different classes of problem, and this project has
consistently required both rather than treating one as a substitute for
the other.

### Performance considerations

None beyond confirming Phase 14's performance results weren't achieved by
cutting a security corner (e.g. skipping an integrity check to hit a
speed target) — this phase should specifically check for that pattern.

### UX considerations

None directly — this is a code-level security review, not a design
review (that already happened in the UI correction pass and Phase 4).

### Tests

Penetration-testing-style manual and automated probing: attempt to
extract business data from a device image without the key; attempt to
craft a malicious backup that bypasses validation; attempt to replay a
registration request; attempt to observe secret values via logs, crash
reports, or clipboard.

### Acceptance Criteria

No CRITICAL or unresolved HIGH finding remains open at the end of this
phase — matching the same bar `phase-4-security-review.md` set for the
design review.

### Exit Gate

A security sign-off recorded in the audit report, with the same three-tier
gate status this project has used consistently (`SECURITY GATE PASSED` /
`PASSED WITH CONDITIONS` / `FAILED`) — release preparation (Phase 16)
should not begin against a `FAILED` gate.

---

## PHASE 16 — Release Preparation

### Objective

Prepare the application for actual distribution — Android and iOS
builds, signing, versioning, a release pipeline, and the store-specific
requirements both platforms impose — without introducing any dependency
this project hasn't already approved (no cloud analytics, no
crash-reporting service, unless explicitly approved separately).

### Inputs

The complete, audited application from Phase 15;
`/mobile-release-engineer`'s release-pipeline expertise, applied to this
specific application's constraints.

### Outputs

Signed, installable Android and iOS builds; a documented release process
(versioning scheme, how migrations are handled across app updates per
`migration-strategy.md`, a rollback plan); store listing content
(respecting `content-style-guide.md`'s writing standard for any
user-facing store copy) satisfying both stores' privacy-disclosure
requirements, accurately reflecting this app's actual data practices
(local-first, no cloud business-data storage, minimal server-side
account/referral data — this is a genuinely strong privacy story worth
representing accurately, not underselling or overclaiming).

### Files

Build/signing configuration (`android/`, `ios/` project-specific signing
setup), a release-process document, store metadata.

### Dependencies

Phase 15, complete (or completed with explicitly accepted conditions, per
that phase's gate).

### Security considerations

- Signing keys and any release secrets must be managed per standard
  mobile release-security practice (never committed to the repository,
  managed via a secrets manager or CI secret store) — this is a new
  category of secret this project hasn't had to handle before this
  phase, and it deserves the same rigor `threat-model.md` already applies
  to application-level secrets.
- **No cloud crash-reporting or analytics dependency is introduced without
  explicit approval** — per the brief's explicit instruction. If crash
  reporting is wanted, it needs its own product-owner decision and its
  own privacy review (what data would it collect, does that data include
  anything from the local business database, which it must not), not a
  default "every mobile app has Crashlytics" assumption.

### Performance considerations

Release/production builds (not debug builds) are what performance
acceptance should ultimately be validated against, since debug builds can
meaningfully misrepresent real performance — this phase should re-confirm
Phase 14's performance results hold on release-configuration builds.

### UX considerations

Store screenshots/descriptions should accurately represent the actual,
approved UI (the Stitch design system) — not aspirational or outdated
imagery.

### Tests

Release-build smoke tests on both platforms; signing verification;
migration-across-versions test (installing an older release, then
updating to the new one, confirming no data loss — the concrete,
practical test of `migration-strategy.md`'s central promise).

### Acceptance Criteria

Signed builds install and run correctly on real devices for both
platforms; the version-upgrade migration test passes; store listings are
accurate and complete.

### Exit Gate

A release candidate build is approved for whatever distribution channel
comes first (internal testing, beta, or production, per the pipeline
`/mobile-release-engineer` defines) — this is the natural end of the
implementation roadmap as scoped by this document; ongoing release
cadence afterward is operational, not a one-time "phase."

---

## Phase dependency graph

```
PHASE 5  — Project Foundation
    │
    ▼
PHASE 6  — Local Database
    │
    ▼
PHASE 7  — Security & Cryptography   (wraps Phase 6's database; also
    │                                  builds the backup pipeline, which
    │                                  Phase 12's restore UI will drive)
    │
    ├─────────────────┐
    ▼                 ▼
PHASE 8              PHASE 9         PHASE 10
Authentication    Matching Engine    Contracts & Reminders
    │                 │                 │
    │                 └────────┬────────┘
    │                          │
    └──────────────┬───────────┘
                    ▼
              PHASE 11 — UI Foundation
                    │
                    ▼
              PHASE 12 — Feature UI Implementation
                    │
                    ▼
              PHASE 13 — Integration
                    │
                    ▼
              PHASE 14 — Testing & Quality
                    │
                    ▼
              PHASE 15 — Security Audit
                    │
                    ▼
              PHASE 16 — Release Preparation
```

### Parallelizable work

- **Phases 8, 9, and 10 can proceed in parallel once Phase 7 is
  complete.** They are architecturally independent of each other:
  authentication doesn't touch business data, the matching engine is a
  pure function over structured criteria with no dependency on contracts
  or auth, and contract/reminder logic doesn't depend on matching or
  auth. Each does depend on Phase 6's schema and Phase 7's encrypted
  database being in place, which is why they're sequenced after Phase 7,
  not before it.
- **Phase 11 (UI Foundation) can start as soon as Phase 5 is complete,
  in parallel with Phases 6-10.** The design-token/component-library work
  has no dependency on the database or business logic — it's pure UI
  infrastructure. This is a genuine, safe parallelization opportunity,
  not a corner-cutting shortcut, since Phase 11's output (the component
  library) doesn't need real data to be built or tested against its own
  design-system-parity criteria.
- **No other parallelization is recommended.** Phase 12 genuinely needs
  Phases 6-11 complete (it binds UI to real data and logic). Phase 13
  genuinely needs Phase 12 complete (there's nothing to integrate until
  screens exist). Phases 14-16 are each gated on the one before them by
  design — testing needs an integrated app, security audit needs a tested
  app, release needs an audited app. Recommending parallelization here
  would mean starting a phase before its actual inputs exist, which isn't
  parallel work, it's working from an incomplete or unstable input and
  redoing work later.

### Critical dependencies (the ones that block the most downstream work)

1. **Phase 6's schema** — nearly every later phase depends on it directly
   or indirectly. Getting the conceptual-data-model translation right
   here avoids costly schema churn later.
2. **Phase 7's encryption wrapper** — Phases 8-10 all read/write through
   the now-encrypted database; a design change here after those phases
   start would ripple backward.
3. **Phase 11's component library** — every one of Phase 12's 44
   screens depends on it; a late change to a base component (e.g.
   discovering the button component doesn't actually support a state a
   screen needs) affects many screens at once.

---

## What this roadmap deliberately does not do

Per the phase's own control rules: it does not write application code,
does not modify the Electron scaffold, does not create React Native
components, and does not install a production dependency. It also does
not silently resolve the product-owner and technical decisions still open
from Phase 4B (KDF benchmarking device baseline, matching engine weight
values, several UX-dependent security mitigations) — those are restated
in this document's final report, not quietly assumed away so the roadmap
can look more finished than the underlying decisions actually are.
