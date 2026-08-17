# Session Handoff — Start Here

Status: The single entry point for a new Claude Code implementation
session. If you are picking up this project cold, read this document
first, then follow its pointers into the authoritative source documents
before touching any code. This file is a **navigation map**, not a
substitute for the documents it points to — where this file summarizes
something, the linked document is still the authority on the details and
the rationale.
Date: 2026-08-08

## What we're building

AZAR CRM (product-facing name "EstatePro CRM") — a mobile, local-first
real-estate CRM for a single-agent user (an agent/broker managing their
own owner and applicant files, a deterministic matching engine between
them, and contract/reminder tracking). Full product framing:
`/docs/00-project-overview.md`, `/docs/01-product-requirements.md`,
`/docs/02-user-stories.md`.

**Where the project stands right now**: architecture, security review,
UI/UX design, and the implementation plan are all complete and
documented. **No application code exists.** The repository is still the
unmodified Electron starter scaffold (`src/main`, `src/preload`,
`src/renderer`, `electron-builder.yml`, `electron.vite.config.ts`) — this
is expected, not a bug to fix reflexively; it gets fully retired at the
start of Phase 5, not before. **Implementation (Phase 5) has not started
and should not start without explicit, current approval from whoever is
running this session** — this handoff documents readiness, it is not
itself that approval.

---

## SECTION 1 — Final project constitution (non-negotiable)

These rules govern every implementation decision from Phase 5 onward.
None of them are open for reconsideration by an implementer — a
disagreement or a discovered conflict with one of them is a **STOP,
document, propose alternatives, wait for approval** situation (see
§11), never a silent override.

**Platform**
- React Native = **FINAL** (`ADR-001`). Capacitor is rejected and not to
  be reintroduced.
- Android minimum = **8.0 / API 26, FINAL** (`ADR-010`). Target/compile
  SDK tracks the latest stable Android SDK. The minimum never moves for
  convenience, a library default, or a newer platform API — an
  incompatible dependency is replaced, never accommodated by raising the
  floor.
- Xiaomi (MIUI and HyperOS) = **first-class supported platform,
  non-negotiable** (`ADR-010`). This is a release requirement, not a
  best-effort target.

**Connectivity**
- The app is **local-first / offline-first**. All business-data workflows
  (owner/applicant files, matching, contracts, reminders, notes, settings,
  backup create/import/validate/restore) work with zero connectivity.
- The **only** online-dependent operations: mobile-number registration,
  OTP send/verify, referral-code validation, recording the registered
  phone/referral relationship, and session establishment/revalidation
  (`ADR-009`).
- **NETWORK FAILURE** (no connectivity, timeout, unreachable/5xx server)
  must never log the user out, destroy local data, or block offline
  functionality. **AUTHENTICATION FAILURE** (server reachable, explicitly
  says the session is invalid) is the *only* thing that ends a session.
  This distinction is `ADR-008` — read it before touching session logic.

**Database**
- SQLite = **FINAL** (`ADR-002`). It is the sole source of truth, not a
  cache. No cloud synchronization of business data, ever.

**Backup**
- Encrypted, portable, exportable, versioned, validated before trust,
  safely restorable. The ten-state restore safety-backup flow
  (`04-final-architecture.md` §7) is mandatory and must not be collapsed
  into fewer states. Encrypted staging for any temporary database copy is
  mandatory (`backup-encryption-design.md` §11.3) — **no plaintext
  sensitive temporary file may exist on disk at any point, even
  transiently.**

**Security**
- Sensitive local business data **must** be encrypted at rest
  (`ADR-005`). Backups **must** use authenticated encryption (`ADR-004`).
- Do not invent cryptographic algorithms or parameters — every choice
  already made (AES-256-GCM, Argon2id, SQLCipher/AES-256) came from a
  dedicated review; anything not yet decided (KDF parameter final values,
  key rotation) stays undecided until benchmarked or reviewed, not
  guessed.
- **Never weaken security to accommodate Xiaomi, Android 8, low-end
  devices, or performance** (`ADR-010`, explicit rule). If a device quirk
  seems to demand a security shortcut, that's a STOP situation, not an
  engineering judgment call.
- Never place secrets in source code. Never log passwords, OTPs,
  encryption keys, backup passwords, or business data in plaintext.

**Matching**
- Deterministic, four-stage pipeline: hard-constraint filter →
  per-criterion evaluation → weighted scoring → explanation assembly
  (`ADR-006`). No AI anywhere in the scoring/decision critical path.
- `MUST_HAVE` / `IMPORTANT` / `PREFERRED` / `IGNORE` priority levels are
  the whole model — nothing else.
- No AI-implying language anywhere in the product ("Smart Analysis," "AI
  matching," etc.) — this was actively corrected out of both the UI copy
  and the matching-engine documentation once already; don't reintroduce
  it.
- **Production scoring weights are OPEN** (`matching-scoring-spec.md`).
  Do not invent numbers. Placeholder/test weights are fine for building
  and testing the pipeline shape; they are not fine to ship.

**Notifications**
- Contract reminders use local device notifications only. No push
  notification dependency, no email alert dependency, no cloud
  notification service (`ADR-007`).

**UI/UX**
- The Stitch design package (`/design/stitch/stitch_elite_real_estate_crm/`,
  44 screens/states) plus `/docs/ui/design-system.md` and
  `/docs/ui/design-tokens.json` are authoritative. Implement what they
  specify — typography, spacing, grid, components, elevation, radius,
  motion, accessibility, RTL/Persian rules, loading/empty/error patterns
  where one is already designed. Do not redesign unless a documented
  defect is found (see §7 for the three known, already-documented gaps).
- All 44 screens/states are mapped in
  `/docs/implementation/ui-screen-mapping.md` — use it as the
  screen-by-screen build checklist.

**Human language**
- All user-facing copy (and this project's own documentation) follows
  `/docs/ui/content-style-guide.md`: natural, professional, complete
  sentences; no robotic wording, no literal-translation Persian, no
  unexplained jargon. Persian UI uses natural professional Persian with
  correct RTL behavior — this was a dedicated correction pass earlier in
  the project (`/docs/changelog.md`, "Human writing & language quality
  standard" entry) and the standard it set still applies to every string
  written from here forward.

---

## SECTION 2 — Android / Xiaomi requirements

Full detail: `ADR-010-minimum-android-version-and-xiaomi-compatibility.md`,
`/docs/implementation/testing-strategy.md` §"Android version and device
compatibility matrix" and §"Xiaomi stability non-functional requirement."

- **Mandatory version matrix**: API 26 (the floor), 9+, 10+, 11+, 12+,
  13+, 14+, 15+, and whatever the current stable Android release is at
  implementation time.
- **Mandatory real-device test set**: one Xiaomi low/mid-range device, one
  Xiaomi mid/high-range device, one non-Xiaomi low/mid-range Android
  device, one Google/stock-like Android device. Emulators supplement this
  set for the broader version matrix; they do not replace it for
  Xiaomi-specific behavior.
- **Mandatory Xiaomi-specific test areas**: process death, activity/
  lifecycle recreation, aggressive battery/background management,
  background restrictions specifically, local-notification scheduling and
  delivery, device reboot and notification rescheduling after reboot,
  filesystem/scoped storage, encrypted SQLite/SQLCipher stability, backup/
  restore under Xiaomi's storage and process behavior, schema migrations
  surviving Xiaomi update/reinstall flows, low-memory conditions, cold
  start, permission changes, force-stop behavior.
- **"Successful compilation is NOT evidence of Xiaomi compatibility."**
  A build succeeding proves the build succeeded. It proves nothing about
  MIUI/HyperOS runtime behavior.
- **Xiaomi stability failures are release-blocking.** The nine specific
  failure categories (crash, startup crash loop, database corruption,
  inability to open the encrypted database, platform-caused backup/
  restore failure, silently-failing reminders, data loss after process
  death, migration failure, UI breakage after lifecycle recreation) are
  enumerated in `testing-strategy.md` and gate Phase 16's release
  approval on the same footing as the Phase 15 security sign-off.

---

## SECTION 3 — Architecture map

Read the linked document **before** modifying the corresponding
subsystem. This section does not restate their content.

| Subsystem | Read before touching |
|---|---|
| Platform / project shape | `ADR-001-mobile-platform.md`, `ADR-010-minimum-android-version-and-xiaomi-compatibility.md`, `/docs/architecture/00-architecture-overview.md`, `/docs/architecture/04-final-architecture.md` |
| SQLite / local database | `ADR-002-local-database-source-of-truth.md`, `/docs/local-data/local-data-architecture.md`, `/docs/database/conceptual-data-model.md` |
| SQLCipher / at-rest encryption | `ADR-005-local-database-encryption.md`, `/docs/security/threat-model.md` §"Local data protection" |
| Backup encryption / key management | `ADR-004-backup-encryption.md`, `/docs/architecture/backup-encryption-design.md` (the full crypto design — AES-256-GCM, Argon2id, DEK/KEK), `/docs/backup/backup-architecture-analysis.md` (the earlier requirements-level analysis it builds on) |
| Authentication / referral | `ADR-009-authentication-boundary.md`, `ADR-008-offline-session-lifecycle.md`, `ADR-003-otp-provider-deferred.md`, `/docs/security/authentication-otp-architecture.md` |
| Matching engine | `ADR-006-matching-engine.md`, `/docs/matching/matching-architecture.md`, `/docs/architecture/matching-scoring-spec.md` |
| Contracts / reminders / local notifications | `ADR-007-local-notifications.md`, `/docs/notifications/notification-architecture.md` |
| Migrations / backup version compatibility | `/docs/architecture/migration-strategy.md` |
| Restore state machine | `/docs/architecture/04-final-architecture.md` §7, `/docs/architecture/backup-encryption-design.md` §6 (validation ordering) and §11 (Phase 4B security-review hardening) |
| Offline/online boundary | `ADR-008-offline-session-lifecycle.md`, `/docs/architecture/04-final-architecture.md` §4 |
| Security posture generally | `/docs/security/threat-model.md`, `/docs/security/phase-4-security-review.md` |
| Full open-item tracker | `/docs/architecture/unresolved-decisions.md` — check this before assuming anything not covered above is settled |

---

## SECTION 4 — Database and data model

Authoritative document: `/docs/database/conceptual-data-model.md` (entity
list, relationships, constraints, indexing). **Do not design a competing
schema** — this document already reconciles every relationship risk
flagged since Phase 0 and has been extended twice (Phase 4, Phase 4B) to
close gaps found along the way.

Entity summary (see the document for full detail on each):
`User`, `ReferralRelationship` (immutable after registration —
`ADR-009`), `Session`, `OwnerFile`, `ApplicantFile`,
`RequirementCriterion` (the applicant's structured, prioritized
preference set — this *is* what the Phase 5B brief calls "Matching
Criteria"/"Applicant Preferences," not a separate entity), `Restriction`,
`Amenity`, `Location`, `Match`, `MatchExplanation`, `Contract`,
`ContractEvent` (Phase 3's `ContractHistoryEntry`, renamed for
terminology consistency, same entity), `ReminderSchedule`, `Reminder`,
`Notification`, `BackupMetadata`, `AuditLogEntry`, `ApplicationSettings`,
`Notes`.

The **owner/applicant shared field model** (common fields, owner-specific
fields, applicant-specific fields, optional/extensible fields, notes) is
in `conceptual-data-model.md` §"Owner/Applicant shared field model" — read
it before building either entity's schema or edit forms, since it's the
answer to "why does this project have one field philosophy instead of two
unrelated ones."

Structured matching fields (`PropertyAttributes`, `RequirementCriterion`)
must stay queryable by the matching engine; `Notes` is free text and is
**never** a matching input — this separation is load-bearing, not
stylistic (Phase 0 Decision 3).

---

## SECTION 5 — Matching engine

Deterministic four-stage pipeline (`ADR-006`,
`/docs/matching/matching-architecture.md`):

1. **Hard-constraint filter** — every `MUST_HAVE` criterion is a binary
   gate, pushed toward SQL-level filtering for performance.
2. **Per-criterion evaluation** — `IMPORTANT`/`PREFERRED` criteria
   evaluated by match type: exact, range, approximate (tapering),
   categorical, amenity/boolean (`matching-scoring-spec.md` §"Match
   types"). `IGNORE` criteria are skipped entirely, never scored as zero.
3. **Weighted score aggregation** — `IMPORTANT` must outweigh `PREFERRED`;
   `MUST_HAVE`/`IGNORE` contribute nothing at this stage (they're already
   resolved). Missing/conflicting/excluded values have specific,
   documented handling (`matching-scoring-spec.md` §"Handling missing,
   conflicting, and excluded values") — don't improvise this.
4. **Explanation assembly** — matched / partially matched / mismatched /
   ignored / conditionally suppressed / critical-satisfied, produced
   directly by stages 1-3, never reconstructed after the fact.

**Conditional criteria** (e.g. "if the property has a pool, ignore
bedrooms/area/price") are supported via a structured suppression
relationship on `RequirementCriterion` — `matching-architecture.md`
§"Conditional / free-text-derived requirements" and
`conceptual-data-model.md` §"Conditional criteria." This is how the
project satisfies free-text-style intent **without** NLP or AI — read
this before building the applicant-requirements UI, since the UI must
expose this relationship explicitly, not paper over it with a text box.

Two-way matching (applicant→properties and property→applicants) is the
same pipeline invoked with roles swapped — not a second implementation.

**PRODUCTION WEIGHTS ARE OPEN.** `matching-scoring-spec.md` fixes the
model completely; it does not fix `IMPORTANT`'s or `PREFERRED`'s actual
numeric weight, the approximate-match tolerance bands, or the score
normalization/presentation scale. Build and test the engine with
placeholder weights (as data, not hardcoded constants, so a later
real-weight decision doesn't require a code change) and do not present
placeholder-weight output as production-ready.

---

## SECTION 6 — Security implementation checklist

Full detail: `ADR-004`, `ADR-005`, `/docs/architecture/backup-encryption-design.md`,
`/docs/security/phase-4-security-review.md` (the dedicated crypto
review — read this before touching anything on this list, since it
already found and fixed six real gaps in the original design).

- **SQLCipher / AES-256** local database encryption, key generated at
  first launch, held **exclusively** in platform secure storage
  (Keychain/Keystore) — never in the database file, never in plain app
  storage.
- **AES-256-GCM** authenticated backup encryption + **Argon2id** KDF
  (64 MiB / 3 iterations / parallelism 1 as the starting point — **not
  yet benchmarked against a real device, see below**).
- **Two-tier DEK/KEK hierarchy** for backups, structurally independent of
  the local database's own encryption key.
- Key material (password, KEK, DEK) handled through a **native crypto
  binding capable of explicit zeroing** — not pure JavaScript, which has
  no deterministic memory-erasure guarantee.
- **Encrypted staging is mandatory**: any temporary database copy created
  during restore or migration must itself be SQLCipher-encrypted, never
  plaintext, even transiently. This was the single HIGH-severity finding
  in the Phase 4B security review — treat it as the highest-priority item
  on this entire list.
- Staging/cache paths excluded from OS-level device backup (iOS
  `NSURLIsExcludedFromBackupKey`, Android backup exclusion rules).
- Crash-remnant cleanup: sweep leftover staging files from a
  non-terminated prior session on every app startup.
- Backup payload parsing must be prototype-pollution-safe and
  resource-bounded (record-count/nesting-depth limits before allocating
  memory proportional to attacker-supplied claims).
- Malicious/corrupt backup handling follows the exact validation order in
  `backup-encryption-design.md` §6 — format recognition → header/version
  check → DEK-unwrap auth check → payload auth check → schema-version
  compatibility → structural validation — **before** any content is
  trusted or the live database is touched.
- Backup version-compatibility window: **CURRENT + 2 previous format
  generations, FINAL** (`migration-strategy.md`) — older backups are
  explicitly rejected, never silently attempted.
- Secrets hygiene: no secret in source code, logs, or crash reports.
- OTP: single-use, time-limited, server-side rate limiting and retry
  limits, server is authoritative — client never self-reports success.
- Referral: **immutable after registration, FINAL** (`ADR-009`) — no
  replace/remove/re-attach path exists once registration succeeds;
  self-referral rejected server-side.
- Session lifecycle: NETWORK FAILURE vs. AUTHENTICATION FAILURE
  distinction (`ADR-008`) implemented exactly as specified — this is the
  single rule most likely to be gotten wrong by reaching for a generic
  "log out on any error" pattern.
- Rooted/jailbroken-device behavior: no detection/blocking is currently
  designed — the app behaves identically to a normal device by default;
  at-rest encryption still applies but is weakened, not nullified, on a
  compromised device (`phase-4-security-review.md` §10).

**Requires real-device benchmarking before FINAL**: the Argon2id
parameters (`backup-encryption-design.md` §3.1 — procedure now fully
defined, target device is a Xiaomi low/mid-range device at or near API
26, per `ADR-010`).

**Requires an implementation-level security review before FINAL**
(distinct from the Phase 4B *design* review, which already happened):
`ADR-004` and `ADR-005` both remain PROPOSED until the actual code is
reviewed — this is Phase 15 in the roadmap, not a Phase 5-8 task, but
worth knowing from the start so implementation doesn't drift from the
reviewed design in ways that would force a re-review.

---

## SECTION 7 — UI/UX implementation

- **44 screens/states**, fully mapped in
  `/docs/implementation/ui-screen-mapping.md` — RN screen name, route,
  data source, and loading/empty/error/success behavior for every one.
  Use it as the build checklist; don't re-derive the mapping from the
  Stitch files independently.
- **Design system**: `/docs/ui/design-system.md` (rationale, component
  specs, RTL rules, accessibility checklist) and
  `/docs/ui/design-tokens.json` (machine-readable numeric values) are
  both authoritative and must never disagree — if implementation finds
  them disagreeing, that's a documentation bug to fix, not a judgment
  call to make silently.
- **Stitch source files**: `/design/stitch/stitch_elite_real_estate_crm/`
  — 44 screen folders (`code.html` + `screen.png` each) plus
  `executive_precision/DESIGN.md` (the original brand spec; `design-
  system.md` §1 already reconciles known inaccuracies between that prose
  and the actual implemented tokens — trust `design-system.md`'s
  reconciliation over `DESIGN.md`'s prose where they'd conflict).
- Material 3 is the structural foundation (type scale, shape, elevation,
  component anatomy) layered with AZAR's own brand identity, Persian/RTL-
  first typography (Vazirmatn), and offline-first visual language — see
  `design-system.md` §0 for the exact positioning statement.
- RTL/Persian: treat as first-class from the start (§13's explicit
  instruction not to build LTR first and retrofit RTL). Vazirmatn font,
  layout mirroring, directional-icon-mirroring rules (mirror navigation
  arrows, never mirror entity icons), Persian digits in prose vs. Western
  digits in currency/phone/percentage contexts — all specified in
  `design-system.md` §3/§13.
- Accessibility: `design-system.md` §20's checklist, including the 48dp
  minimum touch-target requirement (already corrected once across the
  whole Stitch package — implement RN components so this is structural,
  not something each screen has to remember).
- Destructive confirmations, the restore safety-backup UX (ten distinct
  states, never combined), and backup/restore UX generally: `design-
  system.md` §8.21/§8.22 — this is the UI's expression of the restore
  state machine in §3 of this handoff; wire them together exactly, since
  this is the specific area the roadmap flags as highest-risk for
  UI-to-architecture drift.

**Known, already-documented design gaps** (do not silently invent a fix —
these need a short, deliberate design addition, flagged in
`ui-screen-mapping.md` §"Design gaps found during this mapping"):
1. No empty-state design exists yet for the file list, match results
   (zero results), contract timeline, or a true first-run dashboard.
2. No skeleton/loading-state visual pattern has been designed at all.
3. `settings_contract_reminders_persian_rtl` has an LTR/RTL chrome
   inconsistency (full app-shell nav vs. a minimal settings chrome) —
   tracked, not yet resolved.

---

## SECTION 8 — Testing

Authoritative document: `/docs/implementation/testing-strategy.md`. Full
taxonomy (unit, integration, database, migration, backup, restore,
matching, authentication, notification, RTL, accessibility, performance,
security, E2E), a twelve-scenario catastrophic-failure table (corrupted
backup, wrong password, interrupted restore, insufficient storage, app
crash during restore, database corruption, failed migration, network
failure, authentication failure, duplicate reminder, duplicate referral,
malicious backup — each with its *required correct behavior*, not just
"doesn't crash"), a fifteen-area security test matrix, and — added in the
Android/Xiaomi pass — the full API 26-through-current compatibility
matrix and the Xiaomi stability release-blocking requirement (§2 above).
Every catastrophic scenario and every Xiaomi stability category is
release-blocking; neither is optional coverage to skip under time
pressure.

---

## SECTION 9 — Implementation roadmap (Phase 5 onward)

Authoritative document:
`/docs/implementation/implementation-roadmap.md`. **Do not change the
roadmap** — this section summarizes it, it doesn't re-derive it.

| Phase | Objective | Key prerequisite docs | Exit gate (summary) |
|---|---|---|---|
| 5 — Project Foundation | Replace the Electron scaffold with a real RN project (Android + iOS build, TypeScript strict, navigation, state management, lint/format, `minSdkVersion 26`) | `ADR-001`, `ADR-010` | Clean checkout builds and runs the placeholder app on both platforms with no manual setup |
| 6 — Local Database | SQLite schema from the conceptual data model, migrations from version 0, repository layer as the *only* SQL access point | `ADR-002`, `conceptual-data-model.md`, `local-data-architecture.md`, `migration-strategy.md` | Repository integration tests pass against a real SQLite instance; migration chain tested |
| 7 — Security & Cryptography | Wrap the DB in SQLCipher; build the backup create/validate/restore crypto core | `ADR-004`, `ADR-005`, `backup-encryption-design.md`, `phase-4-security-review.md` | Security-test subset passes; a backup file inspected directly shows no readable data |
| 8 — Authentication & Referral | The five-operation online boundary, NETWORK FAILURE vs. AUTHENTICATION FAILURE handled exactly per policy | `ADR-009`, `ADR-008`, `ADR-003`, `authentication-otp-architecture.md` | Session-lifecycle test suite passes; app stays usable offline once authenticated |
| 9 — Matching Engine | Pure, platform-independent four-stage engine, fully unit-testable | `ADR-006`, `matching-architecture.md`, `matching-scoring-spec.md` | Full test-category suite passes against placeholder weights; zero AI/network dependency in the module |
| 10 — Contracts & Reminders | Contract CRUD, idempotent reminder generation, Xiaomi-aware notification scheduling | `ADR-007`, `notification-architecture.md`, `ADR-010` | Idempotency and device-restart-recovery tests pass; a real notification fires on a test device |
| 11 — UI Foundation | Design tokens → real theme + base component library, RTL built in from the start | `design-system.md`, `design-tokens.json`, `content-style-guide.md` | Token-parity and touch-target tests pass; one screen renders correctly in both LTR and RTL |
| 12 — Feature UI Implementation | All 44 screens, wired to real data | `ui-screen-mapping.md`, Phase 11 output, Phases 6-10 output | Every row in `ui-screen-mapping.md` checked off |
| 13 — Integration | Wire every module together; matching's SQL pre-filtering becomes real; full restore state machine runs end-to-end | All prior phases | End-to-end journeys pass on both platforms; performance measured against real data tiers |
| 14 — Testing & Quality | Execute `testing-strategy.md` in full, including the Android/Xiaomi compatibility matrix | `testing-strategy.md` | Full test suite passes; Xiaomi compatibility matrix shows no release-blocking failure |
| 15 — Security Audit | Independent review of the actual *implementation* (distinct from the Phase 4B design review) | `phase-4-security-review.md` as baseline | No CRITICAL or unresolved HIGH finding |
| 16 — Release Preparation | Signed builds, versioning, migration-across-versions test, store listings | `migration-strategy.md`, release-pipeline guidance | Release candidate approved — requires **both** Phase 15's security sign-off and Phase 14's Xiaomi stability sign-off |

**Parallelization** (per the roadmap's own dependency graph): Phases 8, 9,
and 10 may proceed in parallel once Phase 7 is complete. Phase 11 may
start alongside Phases 6-10, right after Phase 5. Nothing else should be
parallelized — every later phase genuinely depends on the one before it.

---

## SECTION 10 — Decision status

### FINAL / CONFIRMED
- Platform: React Native (`ADR-001`)
- Minimum Android version: API 26; Xiaomi first-class (`ADR-010`)
- Local database technology: SQLite (`ADR-002`)
- At-rest encryption requirement (mechanism is PROPOSED, see below)
- Backup version-compatibility window: CURRENT + 2 previous format
  generations (`migration-strategy.md`)
- Referral reuse policy: immutable after registration (`ADR-009`)
- Default reminder offsets: 90/60/30/14/7/3/On Expiration
- NETWORK FAILURE vs. AUTHENTICATION FAILURE policy (`ADR-008`)
- Matching engine pipeline shape and priority semantics (`ADR-006`)
- Local-notification architecture shape (`ADR-007`)
- Restore safety-backup state machine and its ten UI states
- Encrypted staging, native-binding key zeroization, OS-backup exclusion,
  crash-remnant cleanup, malformed-payload parsing safety — all FINAL
  *as requirements* (implementation not yet written)

### PROPOSED (sound design, not yet cleared for production)
- AES-256-GCM + Argon2id backup encryption scheme (`ADR-004`) — algorithm
  choices are effectively settled; awaiting implementation-level review
- SQLCipher/AES-256 local database encryption (`ADR-005`) — same status
- Argon2id parameters (64 MiB / 3 iterations / parallelism 1) — awaiting
  real-device benchmark
- React Native ecosystem choices flagged as recommendations in the
  roadmap (React Navigation, a lighter data-fetching layer over Redux) —
  Phase 5's own experience should validate or revise these

### OPEN / PRODUCT OWNER REQUIRED
- Production matching-engine scoring weights
  (`matching-scoring-spec.md`) — do not guess
- Minimum supported **iOS** version (ADR-010 resolved Android only)
- Exact OTP expiry/attempt-limit values and rate-limiting thresholds
- OTP/SMS provider selection (`ADR-003`, deliberately deferred)
- `Contract.tenant`'s exact relationship shape (ApplicantFile-backed vs.
  minimal record)
- `AuditLogEntry`/`Notification.source` typed-reference mechanism
- App-level PIN/biometric gate (mitigation for the named
  stolen-unlocked-device residual risk)
- Notification lock-screen content visibility, clipboard handling for the
  backup password field
- Single-agent vs. team/admin accounts, account-deletion data retention,
  target accessibility standard, reminder-schedule configurability
  (global vs. per-contract) — all carried from Phase 1/2, still open

Full, continuously-updated list: `/docs/architecture/unresolved-decisions.md`.
**Do not convert anything in this OPEN or PROPOSED list to FINAL as a side
effect of implementation work.**

---

## SECTION 11 — New session startup protocol

Before writing any code, in order:

1. Read this handoff document in full.
2. Read the authoritative documents relevant to whatever phase you're
   about to work on (§3/§9 above tell you which).
3. Inspect the actual repository state — don't trust this handoff's
   description of it to still be current by the time you read it.
4. Run `git status`.
5. Check the current branch.
6. Identify which phase (§9) the repository is actually in, based on what
   exists, not what's expected to exist.
7. Verify that phase's prerequisites are actually met.
8. Re-check `/docs/architecture/unresolved-decisions.md` for anything
   newly relevant to what you're about to build.
9. **Never guess an unresolved decision** — if implementation genuinely
   needs one (e.g. a matching weight value) to proceed, that's a STOP
   situation: document the conflict, name the affected requirement,
   propose options, wait for approval.
10. Use the relevant specialist skills/agents for the work at hand before
    diving into implementation (e.g. a security-focused pass before
    writing crypto code, a UI-design-aware pass before building screens).
11. Inspect the actual Stitch `code.html`/`screen.png` files before
    implementing any UI, not just the mapping document's summary.
12. Run tests after any meaningful change — this project has a defined
    test suite per phase; use it, don't defer it.
13. Update documentation and `/docs/changelog.md` when a decision is
    actually made or a scope changes — the changelog's dated-entry
    convention is already established; follow it.
14. **Never claim device compatibility without actually testing it.**
15. **Never claim Xiaomi compatibility merely because an Android build
    succeeded.**
16. **Never silently change a FINAL decision.** If one turns out to be
    wrong, that's a new ADR superseding the old one with an explicit
    project-owner decision behind it — not a quiet edit.

---

## SECTION 12 — Context efficiency note

This document is a navigation map. It does not contain the reasoning
behind any decision, the full text of any specification, or the complete
screen-by-screen mapping — those live in the documents it points to. If
you find yourself about to copy a large block of another document into a
future revision of this one, stop — add a pointer instead. This file
stays useful specifically because it stays short enough to read in full
at the start of every new session.

---

## Validation performed while creating this document

A scan across `/docs` for contradictions with the finalized Android 8/
Xiaomi decision and the project's other standing constraints found no new
issues:

- **No stale Electron references presented as current architecture** —
  every mention of the Electron scaffold in the documentation set
  correctly frames it as retired-not-adapted starter code, not a live
  dependency.
- **No stale Capacitor references presented as a live option** — all
  remaining Capacitor mentions are in `ADR-001`'s own historical
  analysis section (correctly framed as "considered and rejected," not
  as an open alternative) or in documents explicitly restating that
  rejection.
- **No cloud-sync assumptions** — every architecture document
  consistently states no cloud synchronization of business data exists or
  is planned.
- **No AI-based matching assumptions** — the matching engine documents
  and the UI content-style guide both consistently prohibit AI-implying
  language and mechanisms; no drift found between them.
- **No push/email notification assumptions** — `ADR-007` and the
  notification architecture document consistently specify local
  notifications only.
- **No Android minimum-version contradictions** — no document references
  a minimum higher than API 26; §"Consistency scan" performed during
  `ADR-010`'s own creation already checked this and it still holds.
- **No Xiaomi-compatibility contradictions** — no document treats Xiaomi
  support as optional or best-effort now that `ADR-010` is FINAL.
- **No offline/online boundary contradictions** — the five-operation
  online surface and the NETWORK FAILURE/AUTHENTICATION FAILURE
  distinction are stated identically everywhere they appear.
- **No FINAL-vs-OPEN contradictions** — cross-checked every item this
  handoff lists as FINAL against `unresolved-decisions.md` and found
  agreement in both directions (nothing FINAL here is still listed open
  there, and nothing open there is claimed FINAL here).

No documents required correction as a result of this scan. Nothing was
rewritten beyond creating this handoff document itself.
