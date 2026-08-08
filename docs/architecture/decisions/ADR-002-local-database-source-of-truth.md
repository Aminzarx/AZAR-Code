# ADR-002 — Local Database as Source of Truth

Status: **FINAL (technology decision), confirmed in the Phase 4 final
architecture pass.** The principle "local database is the source of truth"
was already **[CONFIRMED]** (Phase 0 Decision 4); this update finalizes
SQLite as the specific technology. This decision does not depend on
ADR-001 (mobile platform): SQLite is available as a mature, well-supported
binding on both React Native and Capacitor, so finalizing it does not
require the platform question to be resolved first, and does not
prejudge it.
Date: 2026-08-08 (updated)

## Context

Under the local-first model, there is no server-side business database at
all — the local database is not a cache warmed from a server and reconciled
back to it; it is the only copy of the data that exists. This changes what
"good enough" means for several properties (durability, integrity, backup
extraction) compared to a typical mobile app where the server is the ultimate
backstop.

## Decision drivers

Database technology candidates, indexing, migrations, transactions, large
dataset performance, search, matching queries, integrity, backup extraction,
restore, schema versioning — per the project owner's request. Full detail for
each lives in `/docs/local-data/local-data-architecture.md`; this ADR records
the technology-level decision and its rationale.

## Options considered

1. **SQLite (embedded, relational)** — via a platform-appropriate binding
   (e.g. OP-SQLite/`react-native-nitro-sqlite` for React Native, or the
   Capacitor SQLite plugin, contingent on ADR-001).
2. **A document/NoSQL embedded store** (e.g. WatermelonDB's underlying model,
   Realm, or a key-value store like MMKV as the primary data store rather
   than a cache).
3. **A reactive local-first framework built on SQLite** (e.g. WatermelonDB),
   which adds a sync-oriented data layer on top of SQLite.

## Analysis

- **Relational fit**: The domain is inherently relational — owner files,
  applicant files, requirements/criteria, matches, match explanations,
  contracts, reminders, notifications, backups, and audit entries all
  reference each other (Phase 0 §11a already flagged the relationship risks
  to watch). A relational engine with real foreign keys, joins, and
  transactions is a more direct fit than a document store, which would push
  relationship integrity into application code.
- **Query needs of the matching engine**: Matching requires range queries
  (price/area between X and Y), exact-match queries, and filtering across
  multiple structured criteria simultaneously with priority-aware logic
  (`/docs/matching/matching-architecture.md`). SQL's query model, combined
  with proper indexing, maps directly onto this; a key-value or pure
  document store would require re-implementing much of that query capability
  in application code.
- **Maturity and auditability**: SQLite is one of the most widely deployed,
  heavily tested embedded databases in existence, with a stable on-disk file
  format that is well understood for backup/integrity purposes (relevant to
  §"backup extraction" below) and has direct tooling for encryption-at-rest
  (e.g. SQLCipher) that plugs into the backup/encryption analysis without
  requiring a bespoke format.
- **Reactive/sync-oriented frameworks (e.g. WatermelonDB)**: These add real
  value when an app needs offline-first *with* eventual multi-device sync —
  which is explicitly **not** a requirement here (Decision 4: no multi-device
  cloud sync). Adopting a sync-oriented framework's complexity to get its
  reactive-UI convenience, while deliberately not using its sync
  capability, is exactly the kind of unnecessary abstraction the project's
  "do the simplest thing that satisfies the requirements" instruction warns
  against.
- **Key-value stores (e.g. MMKV) as primary store**: Excellent for settings/
  preferences (Phase 1 §6) but a poor fit as the *primary* store for
  relationally-linked business data — flagged as a secondary/complementary
  store, not the source of truth.

## Recommendation

**[FINAL]** SQLite (via a platform-appropriate native binding, selected once
ADR-001 is settled — the binding is platform-specific, the database engine
choice is not) as the primary local database — the direct source of truth
for all business entities — optionally paired with a lightweight key-value
store for simple settings/preferences that don't need relational
structure. SQLCipher is confirmed as the at-rest encryption mechanism in
`ADR-005-local-database-encryption.md`, which supersedes this document's
earlier "noted as natural pairing, not finalized" language — the
encryption *mechanism* is now decided (though still PROPOSED pending
security review, per `ADR-005`); only its specific key-rotation and
implementation-library details remain open. **[CONFIRMED, updated after
Phase 3 review]** At-rest encryption of this database is a **required**
security requirement, not optional (`/docs/security/threat-model.md`,
"Local data protection").

## Consequences

- All business-data queries (file search/filter, matching, contract/reminder
  lookups) are implemented as SQL against a local, on-device database with no
  network round-trip — directly satisfying Decision 4.
- A migration strategy is required from day one (schema versioning, §ADR and
  local-data-architecture doc) since there is no server-side schema to fall
  back on — a broken local migration on a user's only copy of their data is a
  data-loss event, not an inconvenience.
- Backup extraction (Phase 1 §14) becomes "package the local database file(s)
  plus metadata, encrypted" rather than "call an export API" — this is
  analyzed in the backup architecture document.
- Full detail (indexing, transactions, large-dataset performance, integrity,
  restore, schema versioning) is in
  `/docs/local-data/local-data-architecture.md`, not repeated here.

## Status of this decision

**FINAL** as of the Phase 4 final architecture pass. No dependency has been
installed and no code has been written — "FINAL" here means the
architectural decision is settled and implementation may build on it once
Phase 4 implementation begins, not that implementation has started.
