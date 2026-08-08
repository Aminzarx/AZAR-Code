# Migration Strategy

Status: PROPOSED — architecture and policy, not implementation. Builds on
`/docs/local-data/local-data-architecture.md`'s migration requirements and
`/docs/architecture/backup-encryption-design.md`'s format/schema-version
fields. No migration tooling has been selected or installed.
Date: 2026-08-08

## Why this needs its own document

Under the local-first model, there is no server-side schema to fall back
on. A botched migration on a user's device is not an inconvenience to be
fixed by re-syncing — it is a direct, potentially unrecoverable data-loss
event for that one user, unless a backup exists
(`local-data-architecture.md` already names this as the model's central
risk). This document exists to make that risk structurally hard to hit by
accident, covering both the live database's evolution over app updates and
the backup format's compatibility across app versions.

## Database versioning

- The local database carries an explicit **schema version number**, stored
  inside the database itself, checked at every app startup.
- This is the same version concept referenced by
  `backup-encryption-design.md`'s backup header (`schema version`) — one
  versioning scheme serves both the live database's migration path and
  backup compatibility checking, not two separate schemes that could drift
  apart.
- Schema version increments are **monotonic and sequential** (1, 2, 3, …)
  — never skipped, never reused, so a migration path between any two
  versions is always a well-defined, ordered sequence of individual
  migration steps.

## Migration strategy

- Each schema version bump is accompanied by an explicit, versioned
  migration step (e.g. "migrate from v3 to v4") that the app runs, in
  order, starting from whatever version the device's current database
  reports, up to the app's current expected version.
- **Every migration runs inside a single database transaction.** If a
  migration step fails partway through, the transaction rolls back and the
  database is left in its prior, fully-valid state — never a half-migrated
  one. This was already established as a hard requirement in
  `local-data-architecture.md`; this document adds the concrete mechanism:
  the app should refuse to open/use a database it cannot confirm is fully
  migrated to a known-good version, rather than silently operating against
  a database in an ambiguous state.
- **[PROPOSED — should be validated with the project owner as a UX
  decision, not just an engineering default]**: the app should encourage
  or prompt for a backup before a schema-migrating update, where feasible
  (e.g. on first launch after an update that includes a migration). This
  is not a hard technical requirement — the transactional rollback above
  already protects against a *failed* migration — but a *successful*
  migration that changes data in ways the user later wants to undo (rare,
  but possible for a sufically disruptive schema change) has no other
  recovery path without a backup.
- Migration scripts themselves should be simple, reviewable, and testable
  in isolation (e.g. plain SQL or a thin migration-runner library) —
  **[OPEN-ARCH]** exact tooling is an implementation-phase choice, not
  fixed here, consistent with `local-data-architecture.md`'s existing
  "exact migration tooling/library choice" open item.

## Rollback expectations

- **Within a single migration step**: automatic, via the transaction
  wrapping it (above) — a failed step never partially applies.
- **Across multiple already-completed migration steps in one app-update
  session**: if step N of a multi-step migration sequence fails after
  steps 1 through N-1 already committed, the database is left at the
  version step N-1 produced, not rolled all the way back to the original
  pre-update version. This is a deliberate, bounded scope: fully
  reversing an entire multi-version migration sequence would require
  maintaining a "down" migration for every "up" migration indefinitely,
  which is a large maintenance burden for a scenario the transactional
  per-step guarantee already makes rare (each individual step is atomic;
  only a step that itself has a bug would fail after prior steps
  succeeded, at which point re-releasing a fixed app version to continue
  the migration from N-1 is the expected recovery path, not a full
  rollback).
- **The app must never proceed to normal operation against a database
  it cannot confirm is at a fully-migrated, known version.** If migration
  cannot complete, the app should surface this clearly and guide the user
  toward restoring from a backup rather than attempting to "work around"
  an uncertain schema state.

## Backup compatibility

- A backup's header carries the schema version its payload was created
  against (`backup-encryption-design.md` §5/§8). On restore, after the
  backup passes decryption and authentication (§6 of that document), the
  app compares this version against what it currently supports:

| Backup schema version vs. app's current version | Behavior |
|---|---|
| Equal | Restore proceeds directly, no migration needed. |
| Older, and a migration path exists | The restored payload is migrated forward, using the same versioned migration steps the live database would use, applied to the staged/incoming data (never the live database) before it's swapped in. |
| Older, and no migration path exists (too old, support window exceeded) | Restore is rejected with a clear, specific message (RST-04) — the existing local data is untouched, per the restore-safety invariant. |
| Newer than the app currently supports | Restore is rejected with a clear, specific message distinguishing "this backup is from a newer app version" from a generic failure — the existing local data is untouched. |

- **[PRODUCT OWNER DECISION REQUIRED]**: how many prior schema versions
  remain restorable (the "support window") before a backup is rejected as
  too old — this was already flagged as open in
  `backup-architecture-analysis.md` and is restated here because it's the
  concrete policy this table's second row depends on. A reasonable
  starting position (e.g. "migrate forward from any version the current
  app's migration chain still contains steps for") is a viable default,
  but committing to it is a product decision about how much migration
  history to maintain indefinitely, not a purely technical one.

## Old / incompatible backup handling

- Handled by the table above — the key architectural point is that
  version incompatibility is detected and reported **before** any restore
  write begins (§6 of `backup-encryption-design.md`), never discovered
  midway through applying incompatible data to the live database.
- A rejected-as-incompatible backup is not deleted or modified by the
  app — it remains exactly as the user provided it, in case a future app
  version (with an extended migration chain) can read it, or in case the
  user needs to move it to a different device running an older app
  version instead.

## Schema evolution principles

- **Additive changes preferred.** Adding a new nullable column or a new
  table is a low-risk migration. Removing or renarrowing an existing
  column (e.g. making a nullable field required) is higher-risk and
  should be done via an expand-then-contract pattern where practical
  (add the new shape, backfill/migrate data, only remove the old shape in
  a later version) — the same general principle used in
  server-side schema evolution, applied here even though there is no
  server, because the underlying risk (breaking existing stored data) is
  the same.
- **A future application update must not silently destroy existing local
  data.** This is the single governing principle of this entire document:
  every mechanism above (transactional migrations, fail-closed on
  uncertain state, backup-before-migration encouragement, staged/
  never-touch-live-data-until-validated restore) exists in service of it.

## Failure handling summary

| Scenario | Behavior |
|---|---|
| Migration step fails mid-transaction | Automatic rollback to pre-step state; app does not proceed to normal operation against an uncertain database. |
| Migration fails after some steps in a sequence already committed | Database remains at the last successfully-completed version; app surfaces this and guides toward a backup-restore path or a fixed app update. |
| Restore of a too-old, non-migratable backup | Rejected before any write to the live database (RST-04); existing data untouched. |
| Restore of a too-new backup | Rejected before any write to the live database; existing data untouched. |
| Restore of a migratable-but-older backup | Migrated forward on the staged/incoming copy, validated, then swapped in — never migrated in place against the live database. |

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Exact migration tooling/library choice (carried from
  `local-data-architecture.md`).
- **[PRODUCT OWNER DECISION REQUIRED]** Backup version-compatibility
  support window (how many prior schema versions remain restorable).
- Whether to prompt for a backup before a schema-migrating update —
  proposed here, not yet confirmed as a UX decision.
