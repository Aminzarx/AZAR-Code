# Local Data Architecture

Status: DRAFT — Phase 3 architectural analysis. Builds on ADR-002 (SQLite
proposed as the local database technology). Does not define a final schema
(that is Phase 4 — `/docs/database/conceptual-data-model.md` in this phase is
the conceptual-only step). No code written.
Date: 2026-08-08

## Principle: local database = source of truth, not a cache

**[CONFIRMED — Phase 0 Decision 4]** Every analysis below assumes there is no
server copy of business data to fall back on, reconcile against, or treat as
authoritative. This has concrete design implications, called out per topic
below — a cache can tolerate loss and re-fetch; a source of truth cannot.

## Database technology

Per ADR-002: SQLite (embedded, relational), via a platform-appropriate native
binding once ADR-001 (mobile platform) is resolved, is the **[PROPOSED]**
technology. This document assumes that proposal for the analysis below but
does not treat it as final.

## Indexing

- **[OPEN-ARCH — Phase 4 detail]** Exact indexes are a schema-design task, but
  the *categories* of index this product will need are already implied by
  Phase 1's requirements and are recorded here so Phase 4 doesn't have to
  re-derive them:
  - Indexes on the structured, matching-relevant fields of owner/applicant
    files (property type, transaction type, location/neighborhood, price,
    bedrooms, amenities flags) — these are exactly the fields §10
    (Search/Filtering) and the matching engine query most.
  - Indexes on contract expiration date (for reminder-schedule computation)
    and contract status (for search/filter by status).
  - Indexes supporting the two-way matching lookups (finding candidate
    properties for an applicant, and candidate applicants for a property)
    efficiently in both directions.
  - A full-text or prefix-search-friendly index for the global search
    workflow (SRCH-01), which needs to search across free-text fields (notes,
    descriptions) in addition to structured ones — SQLite's FTS5 extension is
    a natural candidate, noted here as an option, not a commitment.
- **Risk**: over-indexing hurts write performance and storage; under-indexing
  hurts the "extremely fast" search/matching requirement (Phase 1 §17). This
  needs to be measured against realistic data volumes once Phase 4's schema
  exists, not guessed.

## Migrations

- **[BUSINESS RULE, elevated from a general concern to a hard requirement by
  the local-first model]** Because there is no server-side schema to fall
  back on, a migration that fails or corrupts data on a user's device is a
  **direct, unrecoverable data-loss event** for that user unless a backup
  exists. This is a materially higher-stakes failure mode than a typical
  client-server app, where a botched client migration can often be repaired
  by re-syncing from the server.
- **[OPEN-ARCH]** Specific migration tooling (e.g. versioned SQL migration
  scripts run at app startup, with a stored schema-version number) is an
  implementation-phase decision, but this document establishes the
  non-negotiable requirements any chosen approach must satisfy:
  1. Every migration must run inside a transaction (see below) so a failed
     migration leaves the database in its prior, still-valid state, not a
     half-migrated one.
  2. The app should encourage or prompt for a backup before a
     schema-migrating update where feasible — **[ASSUMPTION]**, to be
     validated with the project owner, since this affects the update/upgrade
     UX which is itself a UX-dependent decision (see
     `/docs/architecture/ux-dependencies.md`).
  3. Migration failure must be detectable and must not silently proceed with
     a partially-migrated database — the app should refuse to run against a
     database it cannot confirm is fully migrated, and should guide the user
     toward restoring from a backup rather than losing data silently.

## Transactions

- **[CONFIRMED as a requirement, mechanism OPEN-ARCH]** Multi-step writes that
  must be atomic — for example, creating a contract and its initial reminder
  schedule entries, or applying a restore — must run inside a single
  database transaction so a crash or error partway through never leaves
  related records in an inconsistent state (e.g. a contract with no
  reminders, or a match explanation record referencing a match that didn't
  actually save).
- This directly supports the reminder-idempotency requirement (Phase 1 §12,
  REM-03): if reminder generation is itself transactional per (contract,
  offset) pair, a job re-running mid-write cannot produce a duplicate or a
  half-written reminder.

## Large dataset performance

- **[CONFIRMED requirement, Phase 1 §17]**: list rendering, search, and
  matching must not degrade unacceptably as an agent's multi-year file/
  contract history grows.
- **Architectural implication**: queries backing list views must be written
  to return paginated/limited result sets from the database itself (not
  "fetch everything, filter in memory"), and the matching engine's queries
  (§ matching architecture doc) must be structured to use indexes rather than
  full-table scans wherever a MUST_HAVE hard constraint can be pushed into the
  `WHERE` clause before scoring the rest.
- **[OPEN-ARCH]** Concrete pagination size, caching-in-memory strategy for a
  currently-open list, and exact query plans are implementation-phase
  details, deferred pending Phase 4's schema and real data-volume testing
  (Phase 0 §11a already flagged this as a tracked risk).

## Search

- Structured-field search/filter (Phase 1 §10, FILT-01) maps directly onto
  indexed SQL `WHERE` clauses.
- Free-text search (notes, descriptions — explicitly *not* used for critical
  matching per Phase 1 §7.2/§8's separation of structured vs. free-form data)
  is a secondary search concern and a good candidate for SQLite FTS5 or
  equivalent, kept clearly separate in the architecture from the
  structured-criteria matching path so free text never silently becomes a
  matching input (Phase 0 Decision 3's explicit prohibition).

## Matching queries

- Detailed in `/docs/matching/matching-architecture.md`; the local-data
  implication here is narrower: the matching engine's queries should
  distinguish **hard-constraint filtering** (SQL-level, e.g. "exclude any
  property where a MUST_HAVE criterion's field doesn't satisfy the
  requirement") from **score computation** (application-level, over the
  smaller filtered candidate set) — pushing exclusion into the database layer
  keeps the expensive scoring step operating on a much smaller set, which is
  the primary lever for keeping matching fast on large datasets.

## Integrity

- **[CONFIRMED requirement]** Since the local database is the sole copy of a
  user's business data, integrity protections that would be "nice to have" in
  a cache are load-bearing here:
  - Foreign key constraints enabled and enforced (not just documented) so an
    orphaned reference (e.g. a match pointing at a deleted file) cannot occur
    silently — directly addresses the Phase 0 §11a risk about isolated
    fields that can't correctly relate to existing entities.
  - Referential integrity between Reminder↔Contract and
    Notification↔(Reminder|Match|system event) specifically, since Phase 0
    §11a flagged these as the likeliest places for a vague/broken reference.
  - Database-level `NOT NULL`/type constraints on fields that must always be
    present (e.g. a criterion's priority level must never be unset — Phase 1
    §8.1's requirement that every structured criterion has an explicit
    priority).
- **[OPEN-ARCH]** Whether to additionally checksum/verify the database file
  itself at app startup (detecting on-disk corruption from a crash or storage
  fault, independent of backup integrity checking) is a reasonable defensive
  measure to consider in Phase 4/implementation, not decided here.

## Backup extraction

- Covered in depth in `/docs/backup/backup-architecture-analysis.md`; the
  local-data-architecture implication is that backup extraction should be
  designed as "safely snapshot the current local database state" (e.g. using
  SQLite's own backup/serialization APIs, which can safely copy a live
  database without requiring the app to pause all writes) rather than a
  bespoke export format assembled field-by-field — reducing the risk of the
  backup and the live database silently drifting in structure.

## Restore

- Restoring must reconstruct a fully valid local database from a backup file,
  including re-running any migrations needed if the backup was created by an
  older schema version (tying into schema versioning below and the
  restore-validation analysis in the backup document).
- **[CONFIRMED — FINAL, resolved after Phase 3/UI correction round]** Behavior
  when restoring onto a device that already has local data is no longer open:
  it is neither block-until-confirmed-forever nor a silent overwrite, but a
  mandatory sequence — detect existing data → warn → create and validate a
  safety backup of the *current* device data → require explicit "Restore &
  Replace" confirmation → perform the restore → verify the restored dataset
  (`/docs/01-product-requirements.md` §14). This document's technical
  implication still holds and is now sharper: the restore process should
  stage the incoming data (e.g. into a temporary location or transaction),
  and the pre-restore safety backup must itself be completed and validated
  before the live database is touched at all — never overwrite incrementally
  in a way that could leave a half-restored, unusable database, and never
  destroy the pre-restore state before its safety backup is confirmed good.

## Schema versioning

- **[CONFIRMED requirement]** The database must carry an explicit schema
  version number, stored in the database itself, checked at every app
  startup and at every restore, so the app can detect "this database/backup
  is older than what I support" or "newer than what I support" and handle it
  per the migration/restore-compatibility requirements in Phase 1 §14.
- This is the same mechanism referenced by the backup version-compatibility
  requirement (Phase 1 §14, RST-04) — one schema-version concept should serve
  both the live database's migration path and backup compatibility checking,
  rather than maintaining two separate versioning schemes.

## Risks

- The single biggest structural risk of the local-first model is exactly what
  makes it appealing: there is no safety net. A local database corruption
  event with no recent backup is unrecoverable data loss for that user. This
  elevates "encourage regular backups" and "handle migration/corruption very
  defensively" from good practice to load-bearing product requirements.
- Large-dataset performance is currently unmeasured (no schema, no real data
  yet) — flagged as a risk to validate empirically once Phase 4 produces a
  schema, not something this document can respond to with confidence yet.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Exact migration tooling/library choice.
- Whether to checksum the live database file for corruption detection beyond
  backup integrity checking.
- ~~Restore-onto-existing-data behavior (block vs. overwrite)~~ — **resolved,
  FINAL**: mandatory safety-backup-then-explicit-replace sequence (§Restore
  above). Only the staging/atomic-swap implementation mechanics remain open.
- Concrete pagination/caching strategy, pending real data volumes.
