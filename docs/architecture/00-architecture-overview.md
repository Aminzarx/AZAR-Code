# Architecture Overview (Phase 3)

Status: DRAFT — Phase 3, documentation/architectural analysis only. No
application code has been written and no dependencies have been installed as
part of this phase. Builds on the approved `/docs/00-project-overview.md`
(Phase 0), `/docs/01-product-requirements.md` and `/docs/02-user-stories.md`
(Phase 1/2, including the local-first/offline-first amendment).
Date: 2026-08-08

## How to read Phase 3

Phase 3 documents follow the same labeling convention as Phase 1/2:
**[CONFIRMED]**, **[BUSINESS RULE]**, **[OPEN-ARCH]**, **[ASSUMPTION]**. In
addition, this phase introduces **[PROPOSED]** for an architectural
recommendation this document makes but that has not yet been approved by the
project owner, and **[DEFERRED]** for a decision explicitly not made here by
instruction (encryption algorithm, OTP provider, final schema).

Individual decisions with real trade-offs are recorded as ADRs under
`/docs/architecture/decisions/`. This document is the map of how they fit
together, not a restatement of each one in full.

## Binding constraints carried into every decision below

Restated from the project owner's Phase 3 kickoff message, because every
architectural choice in this phase is evaluated against them, not against
generic mobile-app best practice:

1. **[CONFIRMED]** Local-first/offline-first. Business data lives locally; the
   local database is the source of truth, not a cache in front of a server.
2. **[CONFIRMED]** Normal operation requires no internet connectivity.
3. **[CONFIRMED]** Online functionality is limited to: registration, OTP
   send/verification, referral validation, recording the registered
   phone/referral relationship, and establishing a new login session.
4. **[CONFIRMED]** No cloud sync of business data, no cloud business database,
   no cloud matching, no cloud backup requirement.
5. **[CONFIRMED]** No AI dependency in the core matching engine.
6. **[CONFIRMED]** Matching must be deterministic and explainable.
7. **[CONFIRMED]** Backup must be encrypted, portable, and locally controlled.
8. **[CONFIRMED]** Contract reminders use local device notifications, not
   push.

Any architecture proposal in this phase that would violate one of these is a
defect in that proposal, not a trade-off to weigh.

## System shape at a glance

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile Application                    │
│  (platform: React Native or Capacitor — ADR-001, PROPOSED)   │
│                                                                │
│  ┌──────────────┐   ┌──────────────────────────────────────┐│
│  │  UI Layer     │   │         Local Application Core        ││
│  │ (not designed │◄──┤  - Owner/Applicant file management    ││
│  │  yet — Stitch │   │  - Deterministic Matching Engine       ││
│  │  files later, │   │  - Contract & Reminder scheduling      ││
│  │  see UX deps  │   │  - Local Notification scheduling       ││
│  │  doc)         │   │  - Backup create/import/validate/restore│
│  └──────────────┘   └───────────────┬──────────────────────┘│
│                                       │                        │
│                          ┌────────────▼─────────────┐         │
│                          │   Local Database           │         │
│                          │   (source of truth —       │         │
│                          │   ADR-002)                 │         │
│                          └────────────┬─────────────┘         │
│                                       │                        │
│                          ┌────────────▼─────────────┐         │
│                          │ Secure Local Key/Secret    │         │
│                          │ Storage (platform keystore) │         │
│                          └───────────────────────────┘         │
└───────────────────────────────────┬───────────────────────────┘
                                     │  (only this edge touches
                                     │   the network, and only for
                                     │   the account/referral surface)
                          ┌──────────▼───────────────┐
                          │  Thin Auth/Referral        │
                          │  Backend Service            │
                          │  (OTP relay + referral       │
                          │   validation — provider      │
                          │   DEFERRED, ADR-003)         │
                          └───────────────────────────┘
```

This shape is intentionally narrow: everything below the UI layer and above
the network edge operates without connectivity. The network edge is a single,
small, auditable surface — not a general-purpose API the rest of the app
happens to be able to work without.

## Component responsibilities

- **UI Layer**: Not designed yet (see `/docs/architecture/ux-dependencies.md`
  — Stitch designs come before implementation). This document only asserts
  that the UI is a thin layer over the Local Application Core; it holds no
  business data of its own.
- **Local Application Core**: Owns all business logic — file CRUD, matching,
  contract/reminder logic, notification scheduling, backup orchestration.
  Operates entirely against the Local Database; has no required network
  dependency.
- **Local Database**: The single source of truth for all business data
  (`/docs/local-data/local-data-architecture.md`, ADR-002). Not a cache.
- **Secure Local Key/Secret Storage**: Platform-provided secure storage
  (Keychain on iOS, Keystore on Android, or the RN/Capacitor equivalent
  abstraction — platform choice pending ADR-001) holding session material and
  backup encryption key material. Never the local database itself, and never
  plain files.
- **Thin Auth/Referral Backend Service**: The entire server-side footprint of
  the product. Validates OTP delivery/verification and referral codes
  server-side (a confirmed, non-negotiable requirement — Phase 0 Decision 2,
  Phase 1 §5.1), and nothing else. It has no business-data endpoints, no
  matching logic, no backup storage.

## Background jobs

- **Reminder scheduling**: computed locally from contract expiration dates,
  delivered via local OS notification scheduling APIs (§ notification
  architecture doc). No server-side job runner exists or is needed.
- **Automatic backup**: a local, on-device scheduled task (per user
  preference, Phase 1 §14), writing to local device storage — not a remote
  upload.
- There is no background sync job, because there is nothing to sync business
  data with (constraint 4 above).

## Error handling posture

- Every ONLINE_REQUIRED action (§4a of `/docs/01-product-requirements.md`)
  must have an explicit "no connectivity" error state distinct from other
  failure types (see AUTH-06, REF-06 in Phase 2). This is a UI-layer
  requirement to design for, not implement yet.
- Every OFFLINE workflow's error handling is about *local* failure modes
  (validation errors, storage write failures, corrupted local state) — never
  "waiting for a server," since none is involved.
- Backup/restore failure handling (wrong key, corruption, incompatible
  version) is detailed in `/docs/backup/backup-architecture-analysis.md`.

## Document map for Phase 3

| Document | Covers |
|---|---|
| This file | Overview, component shape, cross-cutting constraints |
| `/docs/architecture/decisions/ADR-001-mobile-platform.md` | React Native vs. Capacitor |
| `/docs/architecture/decisions/ADR-002-local-database-source-of-truth.md` | Local DB technology and architecture |
| `/docs/architecture/decisions/ADR-003-otp-provider-deferred.md` | Why/how OTP provider selection is deferred, and the criteria for later |
| `/docs/local-data/local-data-architecture.md` | Deep dive: indexing, migrations, transactions, large datasets, search, integrity |
| `/docs/backup/backup-architecture-analysis.md` | Backup format, encryption/key-management trade-offs, restore behavior |
| `/docs/security/authentication-otp-architecture.md` | Registration/OTP/session/referral flow analysis |
| `/docs/security/threat-model.md` | Threats, mitigations, privacy considerations |
| `/docs/matching/matching-architecture.md` | Deterministic matching engine conceptual design |
| `/docs/notifications/notification-architecture.md` | Contract expiration, reminders, local notifications |
| `/docs/database/conceptual-data-model.md` | Conceptual entities/relationships (not final schema) |
| `/docs/architecture/ux-dependencies.md` | What waits for the Stitch UI designs |
| `/docs/architecture/unresolved-decisions.md` | Consolidated open-decision tracker across all Phase 3 docs |

See the end of this document set for the consolidated A–G report delivered to
the project owner alongside this phase.
