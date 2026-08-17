# Final Architecture (Phase 4)

Status: PROPOSED / partially CONFIRMED, item by item — this is a
consolidation and closing-out document, not a new layer of decisions on
top of everything else. It reconciles the full Phase 3 document set (now
extended) against the approved UI/UX design system and the current state
of the repository, and states plainly what's settled, what's still open,
and what needs a product-owner call before implementation starts.
Date: 2026-08-08

**Scope discipline, restated**: this document, and everything it
references, is architecture and specification only. No application code
was written, no dependency was installed, and no production component was
created as part of this pass.

## 1. Reconciliation: documentation vs. the actual repository

Per instruction not to assume documentation and code are already aligned,
this section states what was actually found:

- **The repository is still the unmodified Electron starter scaffold**
  (`src/main`, `src/preload`, `src/renderer`, `electron-builder.yml`,
  `electron.vite.config.ts`) — exactly as Phase 0 found it. No React
  Native or Capacitor project exists. No SQLite dependency, no encryption
  library, no matching-engine code, no UI implementation of any of the 44
  Stitch screens exists in the codebase.
- **This is not a discrepancy to fix** — it is the expected, correct state
  given every phase to date has been explicitly documentation-only, and
  this phase is too. It is stated here so "final architecture" is not
  mistaken for "architecture the code already reflects." The Electron
  scaffold remains fully retired per `ADR-001`'s consequences section
  once a platform is confirmed — nothing in it is reused.
- **The design package is real and reviewed**: 44 screens exist in
  `/design/stitch/stitch_elite_real_estate_crm/`, audited in
  `/docs/ui/design-system-audit.md`, gated READY FOR PHASE 4. This part of
  the documentation set *is* aligned with a concrete, inspectable
  artifact, unlike the architecture decisions below, several of which are
  still PROPOSED pending product-owner or security-review sign-off.
- **No contradictions found** between the UI design system and the
  architecture documents reviewed for this pass (data model, matching
  engine, backup, security, notifications) — the design system's explicit
  restore-safety-backup flow (`design-system.md` §8.22) matches the
  architecture's restore state machine (§7 below) state-for-state, and the
  design system's prohibited-terms list (no AI/cloud/team language) matches
  the architecture's product-scope boundary (§3 below) term-for-term.

## 2. System shape (confirmed, restated from `00-architecture-overview.md`)

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile Application                    │
│         (platform: PRODUCT OWNER DECISION REQUIRED,          │
│          ADR-001 — recommendation: React Native)              │
│                                                                │
│  ┌──────────────┐   ┌──────────────────────────────────────┐│
│  │  UI Layer     │   │         Local Application Core        ││
│  │ (44 Stitch    │◄──┤  - Owner/Applicant file management    ││
│  │  screens,     │   │  - Deterministic Matching Engine       ││
│  │  READY FOR    │   │    (ADR-006)                           ││
│  │  PHASE 4)     │   │  - Contract & Reminder scheduling      ││
│  │               │   │    (ADR-007)                           ││
│  └──────────────┘   │  - Backup create/import/validate/restore│
│                       │    (ADR-004, backup-encryption-design) ││
│                       └───────────────┬──────────────────────┘│
│                                       │                        │
│                          ┌────────────▼─────────────┐         │
│                          │   Local Database (SQLite)  │         │
│                          │   FINAL — ADR-002          │         │
│                          │   encrypted at rest —       │         │
│                          │   PROPOSED, ADR-005         │         │
│                          └────────────┬─────────────┘         │
│                                       │                        │
│                          ┌────────────▼─────────────┐         │
│                          │ Secure Local Key/Secret    │         │
│                          │ Storage (platform keystore) │         │
│                          └───────────────────────────┘         │
└───────────────────────────────────┬───────────────────────────┘
                                     │  (only this edge touches
                                     │   the network — ADR-009)
                          ┌──────────▼───────────────┐
                          │  Thin Auth/Referral        │
                          │  Backend Service            │
                          │  (OTP relay + referral       │
                          │   validation — provider      │
                          │   DEFERRED, ADR-003)         │
                          └───────────────────────────┘
```

Unchanged in shape from the Phase 3 overview — this pass adds concrete
decisions inside several of these boxes (database encryption, backup
encryption, matching-engine conditional criteria) without changing the
boxes themselves.

## 3. Product scope (confirmed, re-affirmed as a boundary, not re-derived)

Three core capabilities, and nothing beyond them:

1. Owner/applicant file management.
2. Deterministic matching (`ADR-006`).
3. Contract expiration and reminder management (`ADR-007`).

**Explicitly not in scope, and not introduced by this pass**: team
accounts, brokerage accounts, cloud CRM, cloud backup, AI matching, AI
analysis, email reminder infrastructure, push-notification infrastructure,
server-side business database. This list matches the prohibited-terms list
already enforced in the UI package (`design-system-audit.md`'s consistency
scan found zero occurrences) — the architecture and the UI package agree on
this boundary, which is itself a useful cross-check that neither drifted
independently.

## 4. Offline/online boundary (confirmed)

Restated once more, because it is the single most load-bearing constraint
in the entire system and every document above assumes it:

- **Offline, always, no exceptions**: owner/applicant file CRUD, search,
  filtering, sorting, matching and scoring, match explanations, contracts,
  expiration calculations, reminders, local notifications, notes,
  settings, backup creation, backup import, backup validation, backup
  restore.
- **The only online-dependent operations**: mobile-number registration,
  OTP delivery, OTP verification, referral-code validation, recording the
  registered mobile number/referral relationship, and establishing or
  opportunistically revalidating a session (`ADR-009`).
- **Network failure MUST NOT**: log the user out, delete local data, block
  any local business-data functionality, prevent local matching, prevent
  local contract/reminder functionality, or prevent backup/export/import/
  restore. Only an explicit, server-confirmed authentication failure may
  end a session (`ADR-008`'s NETWORK FAILURE vs. AUTHENTICATION FAILURE
  table) — this is enforced as a strict rule, not a best-effort guideline.

## 5. Owner/Applicant shared data model (new in Phase 4)

Full detail in `/docs/database/conceptual-data-model.md` §"Owner/Applicant
shared field model" — summarized here: common fields (identity/contact,
file metadata, notes) apply to both `OwnerFile` and `ApplicantFile`;
owner-specific fields carry the property's structured attributes;
applicant-specific fields carry the `RequirementCriterion` collection
(the applicant's preference set); optional/extensible fields remain
structured and matchable (never free text); notes remain free text and
are never a matching input. Structured fields stay queryable by the
matching engine by construction — there is no path in this model where a
matching requirement can only be expressed as unstructured prose.

## 6. Matching engine (confirmed shape, `ADR-006`)

Four-stage pipeline (hard-constraint filter → per-criterion evaluation →
weighted scoring → explanation assembly), now extended with structured
conditional criteria (`matching-architecture.md` §"Conditional /
free-text-derived requirements") so conditional natural-language-style
requirements ("if pool, ignore bedrooms/area/price") are representable
without depending on NLP. Scoring weights remain explicitly unresolved
— see `matching-architecture.md` §"Scoring-weight decision status" — not
silently defaulted to placeholder numbers in this pass.

## 7. Restore safety state machine (confirmed, transaction/rollback detail)

The mandatory sequence — Existing Data → Safety Backup → Verify Safety
Backup → Explicit Replace Confirmation → Restore → Validate Restored
Data — is a **hard invariant**, not a UX suggestion, enforced at the data
layer as follows:

```
State: EXISTING_DATA_DETECTED
   │  (user confirms intent to proceed; no data touched yet)
   ▼
State: CREATING_SAFETY_BACKUP
   │  Runs the full backup-creation path (backup-encryption-design.md)
   │  against the CURRENT live database.
   │
   ├── FAILURE → State: SAFETY_BACKUP_FAILED
   │              RESTORE MUST NOT PROCEED. No further state in this
   │              machine is reachable from here except back to
   │              CREATING_SAFETY_BACKUP (retry) or CANCELLED.
   │              Live database: untouched.
   │
   ▼ SUCCESS (backup created AND its own integrity/auth-tag verified —
   │          "created" and "verified" are not treated as the same
   │          event; a backup that was written but fails its own
   │          post-write integrity check counts as FAILURE above)
State: SAFETY_BACKUP_VERIFIED
   │  (live database: still untouched — the safety backup's existence
   │   is now guaranteed valid before anything downstream depends on it)
   ▼
State: REPLACE_CONFIRMATION_REQUIRED
   │  Explicit, named-action user confirmation ("Restore & Replace"),
   │  never a bare "OK" — per design-system.md §8.21/§8.22.
   │
   ├── CANCEL (at any point up to and including this state)
   │            → State: CANCELLED. Live database: untouched.
   │              This is state 10 in the UI design's ten-state flow —
   │              always reachable, always leaves data unmodified.
   │
   ▼ CONFIRMED
State: RESTORING
   │  The incoming backup is decrypted, authenticated, and validated
   │  per backup-encryption-design.md §6 (steps 1-6) BEFORE this state
   │  is even entered — RESTORING only begins once the incoming data is
   │  already known-good. Within this state, the incoming data is
   │  staged (written to a new database file / transaction), never
   │  applied incrementally to the live database in place.
   │
   ├── FAILURE (staging or validation fails during this state)
   │            → State: RESTORE_FAILED.
   │              Live database: untouched — the pre-restore live
   │              database was never discarded or modified; only the
   │              staged copy failed. The verified safety backup from
   │              earlier remains available as an additional recovery
   │              path even though it was never needed to restore the
   │              live database itself.
   │
   ▼ SUCCESS (staged data fully written and internally validated)
State: ATOMIC_SWAP
   │  The staged, validated database is atomically swapped in as the
   │  live database. This is the one moment the pre-restore live
   │  database stops being "live" — and it only happens after every
   │  prior gate above has passed.
   ▼
State: VALIDATING_RESTORED_DATA
   │  Post-swap sanity checks (e.g. record counts, schema-version
   │  confirmation) against the newly-live database.
   │
   ├── FAILURE → treated as RESTORE_FAILED with the same guarantee:
   │              the verified pre-restore safety backup remains
   │              available to recover the prior state, since it was
   │              never deleted by this process at any point.
   │
   ▼ SUCCESS
State: RESTORE_SUCCESS
```

**The hard invariants this state machine encodes, restated explicitly**:

1. If safety-backup creation fails, restore cannot proceed — enforced
   structurally (there is no transition from `SAFETY_BACKUP_FAILED` to
   `REPLACE_CONFIRMATION_REQUIRED`), not just by convention.
2. If imported-backup validation fails (at any of the six ordered checks
   in `backup-encryption-design.md` §6), restore does not modify existing
   data — validation happens entirely before `RESTORING` is entered, and
   `RESTORING` itself never writes to the live database, only to a staged
   copy.
3. The pre-restore safety backup is never deleted by any step in this
   machine — it remains available as a recovery path through every
   subsequent state, including failure states.
4. Cancellation is available through every state up to
   `REPLACE_CONFIRMATION_REQUIRED` and always leaves the live database
   untouched.

This maps directly, state-for-state, to the ten-state UI flow already
built and audited as compliant in
`/docs/ui/design-system.md` §8.22 and
`/docs/ui/design-system-audit.md` — the UI states are not a separate
design that happens to look similar; they are the user-facing
representation of exactly this state machine.

## 8. Performance strategy

**[OPEN — no schema exists yet to benchmark against; the expectations
below are architectural targets to design toward, not measured results]**

| Dataset size | Expectation | Primary lever |
|---|---|---|
| ~100 records (new/small agent) | List rendering, search, and matching should feel instantaneous (sub-100ms perceived) — at this scale, even an unindexed full scan would likely be fast enough on modern hardware; this tier exists mainly to confirm nothing is pathologically slow even before optimization matters. |
| ~1,000 records (established agent, 1-2 years) | Indexed queries (per §"Indexing strategy" below) should keep list/search/matching well within a "feels instant" budget; this is the tier most real users are expected to sit in for a long time. |
| ~10,000 records (long-tenured agent or small team's historical data, if ever aggregated) | Stage 1's SQL-pushable hard-constraint filtering (`ADR-006`) becomes load-bearing — the matching engine must not fall back to "fetch everything, filter in application code" at this scale. Pagination on list views is required, not optional, by this tier. |
| ~50,000 records (upper bound this architecture is designed to remain usable at, not a target growth number) | Requires that every list/search/matching query path is indexed and paginated with no exceptions, and that the matching engine's candidate-filtering happens entirely at the database layer before any application-level scoring loop runs. This tier is where an unindexed or non-paginated implementation would become user-visibly slow — named explicitly so it's tested against, not discovered in production. |

- **No premature optimization**: this document does not prescribe caching
  layers, denormalization, or other advanced techniques speculatively —
  it identifies where the architecture must not paint itself into a
  corner (SQL-pushable filtering, indexed queries, paginated list views),
  consistent with `local-data-architecture.md`'s existing guidance.
- **Architectural bottleneck identified, not yet measured**: the matching
  engine's Stage 2-4 (per-criterion evaluation, scoring, explanation
  assembly) runs in application code over the post-Stage-1 candidate set.
  If Stage 1 filtering is weak (e.g. an applicant with very few or very
  loose MUST_HAVE criteria), the candidate set handed to Stages 2-4 could
  approach the full dataset size at the 10,000-50,000 tier — this is a
  real, currently unmeasured risk worth load-testing once a schema exists,
  not a defect in the design.

## 9. Indexing strategy

Consolidated from `local-data-architecture.md` and
`conceptual-data-model.md` — restated here as the authoritative summary:

- `OwnerFile`/`ApplicantFile`: structured matching fields (property type,
  transaction type, location, price, bedrooms, amenities), file status.
- `RequirementCriterion`: by owning `ApplicantFile`, and by the
  `PropertyAttributes` field it targets (Stage 1 filtering support).
- `Contract`: expiration date, status.
- `Reminder`: unique index on `(contract_id, offset)` (idempotency,
  `ADR-007`), plus a lookup index for "reminders due around today."
- `Match`: indexes supporting both directions of two-way matching.
- `Notes`: by owning file and creation date — never indexed for matching,
  by design (notes are never a matching input).
- Full-text/prefix search index (e.g. SQLite FTS5) for free-text note/
  description search, kept structurally separate from the structured
  matching-criteria indexes above.

## 10. Migration strategy

See `/docs/architecture/migration-strategy.md` for the full document —
summarized: schema-versioned, transactional, fail-closed migrations;
backup compatibility keyed off the same version number; a future update
must not silently destroy existing local data.

## 11. Risks (consolidated)

- ~~Platform decision is the single blocking dependency~~ — **resolved in
  the Phase 4B pass**: `ADR-001` is FINAL (React Native). Native module
  selections (SQLite binding, SQLCipher integration, secure-storage
  wrapper, notification scheduling) can now target React Native
  specifically.
- **Cryptographic decisions are PROPOSED, not FINAL, but have now been
  through their dedicated security review** — the Phase 4B review
  (`/docs/security/phase-4-security-review.md`) confirmed `ADR-004` and
  `ADR-005`'s core designs are sound and strengthened them with six
  concrete corrections; both remain PROPOSED because an
  implementation-level review (once code exists) is still required, not
  because the design itself is still in question.
- **Scoring weights are genuinely unresolved** — not a blocker to
  finalizing the rest of the architecture (the pipeline shape and
  constraints are fixed), but a real gap that must be closed before the
  matching engine can be implemented meaningfully.
- **No real data volumes exist yet** to validate the performance
  expectations in §8 against — those expectations are targets, not
  measurements.
- ~~KDF parameter tuning depends on a minimum-device baseline~~ —
  **resolved**: both the platform decision (`ADR-001`, FINAL) and the
  minimum-OS-version/device-tier decision (`ADR-010`, FINAL: Android 8.0
  / API 26, Xiaomi first-class) are now settled. What remains is running
  the benchmarking procedure (`backup-encryption-design.md` §3.1) against
  that now-concrete target, which is implementation work, not an open
  architectural question.

## 12. Document map (Phase 4)

| Document | Status | Covers |
|---|---|---|
| This file | Consolidation | System shape, boundaries, performance, risks, final report |
| `ADR-001-mobile-platform.md` | **FINAL** (Phase 4B) | React Native |
| `ADR-002-local-database-source-of-truth.md` | **FINAL** | SQLite as local DB technology |
| `ADR-003-otp-provider-deferred.md` | DEFERRED (by instruction) | OTP/SMS vendor |
| `ADR-004-backup-encryption.md` + `backup-encryption-design.md` | PROPOSED, pending security review | Backup crypto scheme |
| `ADR-005-local-database-encryption.md` | PROPOSED, pending security review | At-rest DB encryption |
| `ADR-006-matching-engine.md` | CONFIRMED shape / OPEN-ARCH weights | Matching pipeline |
| `ADR-007-local-notifications.md` | CONFIRMED | Reminder/notification architecture |
| `ADR-008-offline-session-lifecycle.md` | CONFIRMED | NETWORK FAILURE vs. AUTHENTICATION FAILURE |
| `ADR-009-authentication-boundary.md` | CONFIRMED shape / several OPEN items | Online surface boundary |
| `ADR-010-minimum-android-version-and-xiaomi-compatibility.md` | **FINAL** | Android 8.0/API 26 minimum, Xiaomi first-class compatibility |
| `/docs/database/conceptual-data-model.md` | Extended | Entities, relationships, shared field model |
| `/docs/matching/matching-architecture.md` | Extended | Pipeline + conditional criteria |
| `/docs/architecture/migration-strategy.md` | **FINAL** (Phase 4B, backup window) | DB/backup versioning and migration |
| `/docs/architecture/matching-scoring-spec.md` | PROPOSED (Phase 4B) | Formal scoring model, weights still open |
| `/docs/security/phase-4-security-review.md` | Complete (Phase 4B) | Dedicated cryptographic security review |
| `/docs/security/threat-model.md` | Extended (Phase 4B) | Full threat catalog |
| `/docs/architecture/unresolved-decisions.md` | Updated (Phase 4B) | Consolidated open-item tracker |
