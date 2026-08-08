# Conceptual Data Model (Phase 3)

Status: DRAFT — conceptual entities and relationships only. **This is
explicitly not the final production schema.** Field-level types, exact
indexes, and migration DDL are Phase 4 work, to be done once this conceptual
model and the rest of Phase 3 are reviewed. No code, no schema files created.
Date: 2026-08-08

## Purpose

Give Phase 4 a reviewed starting point that already reflects every
relationship risk flagged in Phase 0 §11a and every structural requirement
from Phase 1/2 and the rest of Phase 3 — so schema design doesn't have to
re-derive them from scratch, and so early architectural review can happen
before schema-level commitment.

## Entity list (conceptual)

| Entity | Purpose |
|---|---|
| User | An agent/broker account (Phase 1 §2 — the sole user type, pending validation). |
| ReferralRelationship | Records who referred whom, distinct from the User entity itself (see rationale below). |
| Session | A logical login session for a User (supports revocation, Phase 1 §18). |
| OwnerFile | A property/owner record (Phase 1 §7). |
| ApplicantFile | An applicant/requirement record (Phase 1 §8). |
| RequirementCriterion | One structured, prioritized matching criterion belonging to an ApplicantFile (or, for two-way matching purposes, conceptually mirrored for OwnerFile attributes being matched against). |
| Restriction | An exclusion rule attached to an ApplicantFile, distinct from a MUST_HAVE criterion (Phase 1 §8.1). |
| Amenity | A structured, reusable amenity/feature (pool, elevator, parking, etc.) referenced by both OwnerFile and RequirementCriterion. |
| Location | A structured location/neighborhood/area reference, reusable across OwnerFile and RequirementCriterion. |
| Match | A computed match result between one ApplicantFile and one OwnerFile, with a score. |
| MatchExplanation | The structured matched/mismatched/ignored/critical breakdown for a Match (Phase 0 Decision 3's explainability requirement). |
| Contract | Links an OwnerFile, a tenant (ApplicantFile or minimally recorded), and a property, with dates and status (Phase 1 §11). |
| ContractHistoryEntry | An immutable record of a status change on a Contract (Phase 1 §11's "history is retained, not overwritten"). |
| Reminder | A generated reminder for a Contract at a specific offset (Phase 1 §12). |
| Notification | An in-app/local notification record, referencing its source (Reminder, or a system event). |
| BackupMetadata | Records about backups created/restored on this device (not the backup file's contents themselves). |
| AuditLogEntry | A record of a security/data-relevant action (Phase 1 §18). |

## Relationships (conceptual)

```
User ──1───< ReferralRelationship >───1── User
  (referrer)                          (referred, at most one relationship
                                        as "referred", per Phase 1 §5.1's
                                        "no referral code, no registration")
  │
  ├──1───< Session
  │
  ├──1───< OwnerFile
  │           │
  │           ├──*───> Location            (structured, shared reference)
  │           ├──*───> Amenity              (structured, shared reference)
  │           └──1───< Contract >──1── (tenant: ApplicantFile, or minimal
  │                                      tenant record — Phase 1 §11
  │                                      open assumption)
  │
  ├──1───< ApplicantFile
  │           │
  │           ├──1───< RequirementCriterion >──*── Amenity / Location
  │           │           (each criterion: field reference + value/range +
  │           │            priority: MUST_HAVE | IMPORTANT | PREFERRED |
  │           │            IGNORE)
  │           └──1───< Restriction
  │
  ├──1───< Match >──1── OwnerFile
  │           │      └─ 1── ApplicantFile
  │           └──1── MatchExplanation
  │
  └──1───< AuditLogEntry

Contract ──1───< ContractHistoryEntry
Contract ──1───< Reminder >──1── Notification (a Reminder generates at
                                    most one Notification per firing, per
                                    idempotency — Phase 1 §12)

User ──1───< BackupMetadata   (records of this user's own backup activity;
                                the backup file's actual encrypted contents
                                are not modeled as database rows — they are
                                the exported snapshot, per the backup
                                architecture doc)
```

## Important constraints (conceptual, not final DDL)

- **User.referralCode**: unique, system-generated, never user-editable (Phase
  1 §4).
- **ReferralRelationship**: a User can be the *referrer* in many
  relationships (many people used their code) but can be the *referred*
  party in at most one relationship (they registered using exactly one code,
  once) — this asymmetry is why ReferralRelationship is modeled as its own
  entity rather than a single self-referencing "referredBy" field on User: it
  keeps the "referrer of many, referred by exactly one" cardinality explicit
  and queryable (e.g. for REF-02's "referrals made" count) rather than
  implicit.
- **RequirementCriterion.priority**: must never be null/unset — every
  structured criterion has an explicit priority (Phase 1 §8.1, APP-01's
  acceptance criteria).
- **Match ↔ MatchExplanation**: one-to-one, and a Match should not exist
  without its explanation — enforced structurally (e.g. created in the same
  transaction) so "a mysterious 92% match with no explanation" (Phase 0
  Decision 3's explicit prohibition) is not just a UX promise but something
  the data model makes hard to represent incorrectly.
- **Reminder**: unique on `(contract_id, offset)` — the idempotency mechanism
  itself (§ notification architecture doc), not optional.
- **Contract.tenant**: **[OPEN-ARCH, carried from Phase 1 §11]** whether this
  is a required foreign key to ApplicantFile or can reference a minimally-
  recorded tenant not backed by a full ApplicantFile remains open — modeled
  here as a relationship that must support both shapes until that's decided.
- **AuditLogEntry**: should reference *what* was acted on generically enough
  to cover file deletion, backup restore, login, and referral use (Phase 1
  §18) without becoming the same kind of vague/polymorphic reference Phase 0
  §11a warned against for Notification — **[OPEN-ARCH]** the exact mechanism
  (a typed discriminator + entity ID, rather than a free-form reference) is a
  Phase 4 schema decision, flagged here so it isn't designed carelessly.
- **Notification.source**: same caution as above — must reference its
  originating Reminder (or a well-defined, closed set of system-event types)
  through an explicit, typed relationship, not a generic/untyped pointer.

## Indexing considerations (carried from local-data-architecture.md)

- OwnerFile/ApplicantFile: structured matching fields (type, transaction
  type, location, price, bedrooms, amenities), file status (active/
  archived).
- Contract: expiration date, status.
- Reminder: `(contract_id, offset)` unique index (idempotency), plus a
  lookup index for "reminders due around today" (scheduling evaluation).
- Match: indexes supporting both directions of two-way matching (by
  ApplicantFile, and by OwnerFile).

## Risks (carried and expanded from Phase 0 §11a)

- Contract.tenant's open shape (ApplicantFile vs. minimal record) is the
  single biggest remaining relationship risk — it affects how Contract joins
  to the rest of the model and should be resolved before Phase 4 schema
  work begins in earnest.
- AuditLogEntry and Notification's "what does this refer to" design is
  exactly the kind of decision that's easy to get wrong quietly (a vague
  polymorphic reference that technically works until it doesn't) — flagged
  explicitly rather than left to be discovered during implementation.
- BackupMetadata's exact fields depend on the backup format decisions in
  `/docs/backup/backup-architecture-analysis.md`, which are themselves not
  finalized — this entity's shape is provisional pending that.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Contract.tenant's exact relationship shape.
- AuditLogEntry's typed-reference mechanism.
- Notification.source's typed-reference mechanism.
- Whether RequirementCriterion needs a parallel structure on OwnerFile (for
  two-way matching symmetry) or whether OwnerFile's plain structured fields
  are sufficient as match *targets* without needing their own priority
  metadata (properties don't have "priorities," only applicants do — worth
  confirming this asymmetry is intentional, not an oversight).
