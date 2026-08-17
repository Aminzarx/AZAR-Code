# Phase 6 Notes — Local Database Foundation

Status: RECORD OF IMPLEMENTATION-PHASE FINDINGS, in the same spirit as
`phase-5-decisions.md` — tooling friction and scope decisions made while
building Phase 6, kept here so a later phase doesn't rediscover them.
Date: 2026-08-08

## Scope of this Phase 6 pass

Per `docs/architecture/decisions/ADR-011-sqlite-binding-selection.md`
(approved), `@op-engineering/op-sqlite` is integrated and the local
database foundation — connection management, migration runner, schema
versioning (`PRAGMA user_version`), transaction handling, and a
repository-pattern example — is built.

**Schema (migration `0001`)** covers every entity from
`docs/database/conceptual-data-model.md` whose relationship shape has no
open question attached: `User`, `ReferralRelationship`, `Session`,
`Location`, `Amenity`, `OwnerFile` (+ its amenity join table),
`ApplicantFile`, `RequirementCriterion` (+ its conditional-suppression
join table), `Restriction`, `Match`, `MatchExplanation`,
`ReminderSchedule`, `Notes`, `ApplicationSettings`.

**Deliberately deferred, not forgotten** — each blocked by a
still-open, documented decision, per this project's "never guess an
unresolved decision" rule:
- `Contract` / `ContractEvent` / `Reminder` — blocked by
  `Contract.tenant`'s open relationship shape
  (`conceptual-data-model.md` §"Important constraints").
- `AuditLogEntry`, `Notification` — both explicitly flagged OPEN-ARCH for
  their typed-reference mechanism.
- `BackupMetadata` — explicitly named "provisional" pending the backup
  format decisions in `docs/backup/backup-architecture-analysis.md`.

These get their own migration once their shape question resolves — adding
them later is a normal additive migration, not a rework of anything built
in this pass.

## Native dependency: `@op-engineering/op-sqlite@17.1.5`

Installed per ADR-011. Statically verified (real device build was not
possible in this environment — see the same caveat `phase-5-decisions.md`
already recorded):
- Reads `minSdkVersion` from the root project's `ext` block, same as
  every other native module in this project — inherits the project's 26,
  imposes no conflicting floor.
- iOS: no special Podfile requirement beyond RN's standard
  `use_native_modules!` autolinking (already present, unmodified from
  Phase 5).
- SQLCipher is not enabled in this phase (no `"op-sqlite": {"sqlcipher":
  true}` key in `package.json`) — Phase 6 opens a plain database on
  purpose, per the roadmap's Phase 6→7 sequencing. `connection.ts` is
  written so enabling it later is a parameter addition, not a rewrite.

## Tooling findings (test-harness only — do not affect production code)

1. **op-sqlite's published Node.js binding had a packaging bug.**
   `@op-engineering/op-sqlite`'s `node/dist/index.js` (the binding used to
   run real SQLite operations under Jest/Node, backed by
   `better-sqlite3`) imports `"./database"` and re-exports from it without
   a `.js` extension — invalid under Node's strict ESM resolver, which the
   package's own `"type": "module"` requires. This is an upstream bug, not
   a project misconfiguration (verified by reproducing it with a bare
   `node -e` script against the untouched package). Fixed via a tracked
   `patch-package` patch (`patches/@op-engineering+op-sqlite+17.1.5.patch`,
   applied automatically by the `postinstall` script) rather than an
   untracked edit — two import lines, `.js` extensions added. Does not
   touch anything shipped in the actual mobile app; only the Node-only
   test binding.
2. **`better-sqlite3` added as a devDependency**, required by op-sqlite's
   Node binding to run real SQLite operations outside a device. Dev-only;
   not part of the shipped app bundle.
3. **Jest resolves `@op-engineering/op-sqlite` to its Node binding via
   `moduleNameMapper`** (`jest.config.js`) — Jest's RN preset otherwise
   resolves the package's `"react-native"` build (a native-bridge stub
   with no binary to call under Jest), the same class of problem
   `phase-5-decisions.md` §4 already hit with `react-native-screens`.
4. **PRAGMA query results come back through `rawRows`, not `rows`, on this
   binding.** `db.execute('PRAGMA user_version')` returns an empty `rows`
   array even after a successful read; `db.executeRaw(...)` returns the
   value correctly via `rawRows`. `migrationRunner.ts`'s
   `getSchemaVersion` uses `executeRaw` for exactly this reason — verified
   directly against the Node binding, not assumed from documentation.

None of these four items are visible to or affect the real Android/iOS
app — all are specific to making a native module runnable under Jest's
Node environment for testing.

## What was verified vs. what remains open

**Verified in this pass** (against a real SQLite engine, via 18 passing
tests): schema creation, foreign key enforcement, the `priority` CHECK
constraint, transactional migration rollback-on-failure, migration
idempotency, and basic repository CRUD.

**Not verified in this pass** (same limitation already recorded in
`phase-5-decisions.md` — no Android SDK or Xcode in this environment):
- An actual native Android/iOS build with op-sqlite linked in.
- Any Xiaomi/MIUI/HyperOS-specific behavior (per `ADR-010`, this requires
  Phase 14's real-device matrix regardless of binding).
- Performance at the 50,000-record tier — schema and indexes are designed
  with it in mind (per `04-final-architecture.md` §8/§9) but not yet
  measured against real data volume.
