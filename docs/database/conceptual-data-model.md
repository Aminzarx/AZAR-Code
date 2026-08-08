# Conceptual Data Model (Phase 3, extended in Phase 4)

Status: DRAFT — conceptual entities and relationships only. **This is
explicitly not the final production schema.** Field-level types, exact
indexes, and migration DDL are implementation work, to be done once this
conceptual model is reviewed and approved. No code, no schema files
created. Extended in the Phase 4 final-architecture pass (§"Entities added
in Phase 4" and §"Owner/Applicant shared field model" below) to cover
entities the Phase 3 version left implicit.
Date: 2026-08-08 (extended)

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
| OwnerFile | A property/owner record (Phase 1 §7). Carries the owner's contact/identity fields plus the property's structured attributes (see `PropertyAttributes`, below — modeled as a set of fields on `OwnerFile` conceptually, not a separate table, since a property has exactly one attribute set for its lifetime; called out as its own row here only because the Phase 4 brief names it explicitly). |
| PropertyAttributes *(conceptual grouping, not a separate table — see OwnerFile note above)* | The structured, queryable property characteristics that matching runs against: type, transaction type, price, area, bedrooms, bathrooms, location, amenities, condition/age, and any other MUST_HAVE/IMPORTANT/PREFERRED-matchable field. These live on `OwnerFile` itself. Named separately here purely to make explicit that this field group is what `RequirementCriterion` (below) references — matching a requirement means comparing it against exactly these fields, never against free text. |
| ApplicantFile | An applicant/requirement record (Phase 1 §8). Carries the applicant's contact/identity fields plus their structured preferences (see `RequirementCriterion`, which *is* the applicant's preference model — see the note below on why this document does not also model a separate, redundant "ApplicantPreferences" table). |
| RequirementCriterion *(this is the "Applicant Preferences" / "Matching Criteria" entity the Phase 4 brief names separately — they are the same entity, not two)* | One structured, prioritized matching criterion belonging to an ApplicantFile: a reference to a specific `PropertyAttributes` field, a target value/range/tolerance, and a priority (MUST_HAVE / IMPORTANT / PREFERRED / IGNORE). An applicant's full "preference set" is simply the collection of their `RequirementCriterion` rows — modeling a separate `ApplicantPreferences` entity on top of this would either duplicate the same data under a second name or become the kind of vague, loosely-typed field Phase 0 §11a already warned against. See §"Conditional criteria" below for how conditional requirements (e.g. "if pool, ignore price") extend this entity. |
| Restriction | An exclusion rule attached to an ApplicantFile, distinct from a MUST_HAVE criterion (Phase 1 §8.1). |
| Amenity | A structured, reusable amenity/feature (pool, elevator, parking, etc.) referenced by both OwnerFile and RequirementCriterion. |
| Location | A structured location/neighborhood/area reference, reusable across OwnerFile and RequirementCriterion. |
| Match | A computed match result between one ApplicantFile and one OwnerFile, with a score. |
| MatchExplanation | The structured matched/mismatched/ignored/critical breakdown for a Match (Phase 0 Decision 3's explainability requirement). |
| Contract | Links an OwnerFile, a tenant (ApplicantFile or minimally recorded), and a property, with dates and status (Phase 1 §11). |
| ContractEvent *(Phase 3's `ContractHistoryEntry`, same entity)* | An immutable record of a status/date change on a Contract (Phase 1 §11's "history is retained, not overwritten"). Renamed in this document to match the terminology the Phase 4 architecture brief uses ("Contract Events") — no structural change, see the note in §"Entities added in Phase 4." |
| ReminderSchedule *(new in Phase 4)* | The **configuration** of which offsets apply — either the global default (90/60/30/14/7/3/0 days) or a per-contract override, if per-contract configurability is ever confirmed (currently open, Phase 1 §12/§19.6). Distinct from `Reminder` below: this is "what offsets should generate reminders," not "a reminder that has actually been generated." |
| Reminder | A generated reminder **instance** for a Contract at a specific offset (Phase 1 §12) — the durable, idempotent record produced by evaluating `ReminderSchedule` against a Contract's expiration date, per `ADR-007-local-notifications.md`. |
| Notification | An in-app/local notification record, referencing its source (Reminder, or a system event). |
| BackupMetadata | Records about backups created/restored on this device (not the backup file's contents themselves). |
| AuditLogEntry | A record of a security/data-relevant action (Phase 1 §18). |
| ApplicationSettings *(new in Phase 4)* | Device-local, non-business-data app preferences — reminder-schedule defaults (before any per-contract override), notification permission state cache, UI preferences. Lives outside the encrypted business-data tables per `ADR-005-local-database-encryption.md`'s "what is not encrypted" note, since it contains no business data or secrets. |
| Notes *(formalized in Phase 4)* | Free-text notes attached to an `OwnerFile` or `ApplicantFile`. Phase 3 treated this as a field; formalized here as its own entity (§"Owner/Applicant shared field model" below) so multiple, timestamped notes per file are representable, not just one overwritable text blob. |

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
  implicit. **[FINAL, Phase 4B]** The referred-party side of this
  relationship is immutable once written — created exactly once, at
  registration, and never updated, replaced, or deleted afterward
  (`ADR-009-authentication-boundary.md` §"Referral reuse policy"). No
  application code path should expose an operation that modifies an
  existing ReferralRelationship row's referred-party reference.
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

## Owner/Applicant shared field model (new in Phase 4)

The Phase 4 brief asks for one shared field philosophy across
`OwnerFile` and `ApplicantFile` rather than two unrelated field systems —
this section defines it. The structured fields must stay queryable by the
matching engine; free text must never become the only representation of a
matching requirement (Phase 0 Decision 3).

**COMMON FIELDS** (present on both, same shape):
- Identity/contact: full name, phone number, email (optional), preferred
  contact method.
- File metadata: created date, last-updated date, status (active/
  archived), owning `User` (the agent).
- `Notes`: one or more free-text, timestamped notes (see the `Notes`
  entity above) — never a matching input, always supplementary.

**OWNER-SPECIFIC FIELDS** (only on `OwnerFile`):
- The property's structured `PropertyAttributes` (type, transaction type,
  price, area, bedrooms, bathrooms, location, amenities, condition/age).
- Property media references (photos), if/when that feature exists —
  **[OPEN, out of scope for this pass]**.
- Listing status distinct from file status (e.g. "available," "under
  contract," "rented/sold") — feeds `Contract` linkage.

**APPLICANT-SPECIFIC FIELDS** (only on `ApplicantFile`):
- The applicant's `RequirementCriterion` collection (their structured
  preference set, each with a priority).
- Budget range, if modeled separately from a `RequirementCriterion` on
  price for UX convenience — **[OPEN-ARCH]**, a schema-design-time choice
  that doesn't change the matching-engine contract either way, since
  budget is still just a price-field `RequirementCriterion` under the
  hood.

**OPTIONAL / EXTENSIBLE FIELDS**: both file types should support a small
set of structured-but-not-universally-required fields (e.g. a specific
amenity that only matters for some property types) without requiring a
schema migration for every new field. **[OPEN-ARCH]** whether this is
implemented as a narrow EAV (entity-attribute-value) side table scoped
only to genuinely optional/extensible attributes, or as a versioned JSON
column with an enforced schema-per-version — either can satisfy "stays
queryable by the matching engine" as long as the extensible fields are
still exposed to Stage 1/2 of the matching pipeline as first-class,
typed values, not opaque blobs. This is explicitly *not* the same
mechanism as `Notes` — an extensible field is still structured and
matchable; a note never is.

**NOTES / FREE-TEXT FIELDS**: exist for context a structured field
doesn't capture ("owner prefers showings after 5pm," "applicant mentioned
they're relocating for a new job") and are never read by the matching
engine. This separation is the direct data-model expression of Phase 0
Decision 3's prohibition on free text silently becoming a matching input,
and of `/docs/matching/matching-architecture.md`'s conditional-criteria
design (§ below) existing specifically so a *user-confirmed* structured
equivalent is always available instead of relying on free text.

## Conditional criteria (new in Phase 4)

To support requirements users might otherwise only express in prose (e.g.
"if it has a pool, I don't care about bedrooms, size, or price"),
`RequirementCriterion` gains an optional **conditional-suppression**
relationship: a criterion can name one or more other criteria on the same
`ApplicantFile` that become `IGNORE` when it is satisfied. This is a
structured mechanism, not NLP — see
`/docs/matching/matching-architecture.md` §"Conditional / free-text-derived
requirements" for the full design, including how the matching pipeline
evaluates it. Modeled here as a self-referencing relationship on
`RequirementCriterion` (a criterion → the set of criteria it suppresses),
kept intentionally simple (no arbitrary boolean logic across multiple
conditions in this pass) so it stays implementable without inventing a
general rules engine.

## Indexing considerations (carried from local-data-architecture.md)

- OwnerFile/ApplicantFile: structured matching fields (type, transaction
  type, location, price, bedrooms, amenities), file status (active/
  archived).
- Contract: expiration date, status.
- Reminder: `(contract_id, offset)` unique index (idempotency), plus a
  lookup index for "reminders due around today" (scheduling evaluation).
- Match: indexes supporting both directions of two-way matching (by
  ApplicantFile, and by OwnerFile).
- RequirementCriterion: index by ApplicantFile (fetching an applicant's
  full criteria set is the common access pattern) and by the
  `PropertyAttributes` field it targets (supports Stage 1's SQL-pushable
  hard-constraint filtering, per `matching-architecture.md`).
- Notes: index by owning file (OwnerFile or ApplicantFile) and creation
  date, for chronological display; never indexed for matching purposes.

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
