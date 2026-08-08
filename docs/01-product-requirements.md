# 01 — Product Requirements

Status: DRAFT — Phase 1, amended. Builds on the approved Phase 0 findings in
`/docs/00-project-overview.md` (§2a confirmed decisions, including Decision 4:
local-first/offline-first, added after this document's initial sign-off). No
application code has been written. No implementation-level decisions (RN vs.
Capacitor, OTP provider, encryption algorithm, matching engine internals, final
DB schema, local storage technology) are made in this document — see §19.3 for
what remains explicitly open, and §4a for the connectivity classification that
resulted from Decision 4.
Date: 2026-08-08 (amended)

## How to read this document

Every requirement is labeled with one of the following tags so confirmed product
direction is never confused with an implementation detail still awaiting a
decision:

- **[CONFIRMED]** — a decision already made by the project owner (Phase 0 §2a) or
  restated directly from PRODUCT.md's explicit instructions.
- **[BUSINESS RULE]** — a behavioral rule the product must enforce, derived from
  PRODUCT.md, not yet a technical design.
- **[OPEN-ARCH]** — the requirement is confirmed, but *how* it is implemented is
  an open architectural decision for a later phase (Phase 3/4 or dedicated
  security/matching/backup docs).
- **[ASSUMPTION]** — a reasonable working assumption made to keep this document
  concrete, which must be validated with the project owner before Phase 3.

---

## 1. Product Goals

1. **[CONFIRMED]** Give real-estate agents/brokers a fast, reliable, mobile
   tool to manage owner/property files and applicant/requirement files.
2. **[CONFIRMED]** Replace manual, memory-based, or spreadsheet-based matching
   between applicants and available properties with a deterministic, explainable
   matching engine that works without any AI dependency.
3. **[CONFIRMED]** Prevent lost rental/sale opportunities caused by missed
   contract renewals, via automatic expiration tracking and reminders.
4. **[CONFIRMED]** Be usable one-handed, on a phone, in the field, including
   under poor connectivity — this is a first-class UX requirement, not a
   secondary optimization (Phase 0 Decision 1).
5. **[CONFIRMED]** Protect user and client data with real, auditable security
   and an encrypted, portable backup mechanism, without ever claiming
   "unhackable" security (PRODUCT.md's explicit instruction).

## 2. User Types

- **Agent/Broker (primary user / "User")** — [CONFIRMED] the only user type
  PRODUCT.md and Phase 0 discovery describe in concrete terms: registers via
  mobile number + OTP + referral code, manages owner and applicant files, runs
  matching, tracks contracts, receives reminders, manages backups.
- **Referrer** — [BUSINESS RULE] not a separate account type; any existing
  Agent/Broker can act as a referrer by sharing their unique referral code.
  Referrer and Agent/Broker are the same underlying entity in different roles.
- **System/Background process** — [OPEN-ARCH] not a human user, but a
  functional actor: generates reminders, evaluates matches, runs scheduled
  backups. Named here because several user stories in Phase 2 have "System" as
  the actor.
- **[ASSUMPTION]** No admin/back-office user type, no multi-tenant
  organization/team concept, and no owner-facing or applicant-facing accounts
  (owners and applicants are *data* — files — not authenticated users) are in
  scope for the first production version. This must be validated — PRODUCT.md
  does not explicitly rule out multi-agent teams or an admin role, but nothing
  in it requires one either. Flagged in §19.6.

## 3. Core Workflows

1. **[CONFIRMED]** Register (mobile number + OTP + referral code) → verify → land
   on a home/dashboard screen.
2. **[CONFIRMED]** Create/manage owner (property) files with structured,
   searchable fields.
3. **[CONFIRMED]** Create/manage applicant (requirement) files with structured,
   prioritized criteria (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE).
4. **[CONFIRMED]** Run matching — from an applicant, see ranked candidate
   properties with an explanation; from a property, see ranked candidate
   applicants with an explanation (two-way matching).
5. **[CONFIRMED]** Track a contract from creation through expiration, with
   automatic, configurable, idempotent reminders as expiration approaches.
6. **[CONFIRMED]** Search/filter across owner files, applicant files, and
   contracts, quickly, including while offline against locally available data.
7. **[CONFIRMED]** Back up data locally (manual and automatic), export/transfer
   it to another device, and restore it — no cloud backup required (Phase 0
   Decision 4) — with encryption and integrity protection whose exact
   mechanism is still open (§19.3).
8. **[CONFIRMED]** Receive and manage notifications (reminders, system events)
   in-app and via local device notifications, with read/unread state and a
   history (Phase 0 Decision 4 — push notifications are not required for
   reminders).

## 4. Business Rules (cross-cutting)

- **[BUSINESS RULE]** No referral code, no registration. There is no
  alternate registration path.
- **[BUSINESS RULE]** Referral-code validation happens server-side; a client
  that reports "valid" cannot be trusted on its own (Phase 0 Decision 2).
- **[BUSINESS RULE]** A user cannot refer themselves.
- **[BUSINESS RULE]** Each user has exactly one unique referral code, generated
  by the system at registration, never user-chosen.
- **[BUSINESS RULE]** The matching engine never produces a score without also
  producing an explanation (matched/mismatched/ignored criteria + critical
  requirements) — an unexplained score is treated as a defect, not a feature
  gap (Phase 0 Decision 3).
- **[BUSINESS RULE]** A background job re-running (e.g. the reminder scheduler
  firing twice for the same day) must never produce a duplicate
  user-visible reminder or notification.
- **[BUSINESS RULE]** Destructive operations (delete file, delete contract,
  restore-overwriting-current-data) always require explicit confirmation.
- **[BUSINESS RULE]** The application must remain fully functional — including
  full matching functionality — with zero AI API configured, at every stage of
  the product's life (Phase 0 Decision 3), not only at initial launch.
- **[CONFIRMED — added after initial Phase 1 documentation]** The application
  is local-first/offline-first: normal daily business operations must not
  require internet access, business data is not uploaded to a server during
  normal operation, and network access is limited to a small account/referral
  surface (Phase 0 Decision 4). See §4a for the full workflow classification.

## 4a. Connectivity Classification — OFFLINE / ONLINE_REQUIRED / ONLINE_OPTIONAL

**[CONFIRMED — Phase 0 Decision 4]** Every workflow in this document is
classified below so no later phase has to guess which parts of the product may
depend on connectivity. This classification is authoritative; where a
workflow's section below repeats or elaborates on it, the section defers to
this table in case of any apparent conflict.

| Workflow | Classification | Notes |
|---|---|---|
| Owner file create/edit/view (§7) | **OFFLINE** | No connectivity required at any point. |
| Applicant file create/edit/view (§8) | **OFFLINE** | No connectivity required at any point. |
| Search (§10) | **OFFLINE** | Operates against local data only; there is no cloud data to be "incomplete" against. |
| Filtering / sorting (§10) | **OFFLINE** | Same as search. |
| Matching / match scoring (§9) | **OFFLINE** | Deterministic engine operates entirely on local structured data (Phase 0 Decision 3 + Decision 4 together). |
| Match explanations (§9) | **OFFLINE** | Generated locally alongside the score. |
| Contract creation/editing/tracking (§11) | **OFFLINE** | No connectivity required. |
| Contract expiration calculations (§11, §12) | **OFFLINE** | Pure local date/state computation. |
| Reminder scheduling (§12) | **OFFLINE** | Computed locally from local contract data. |
| Local (device) notifications (§13) | **OFFLINE** | Delivered by the device's local notification mechanism, not a push server. |
| Notes (structured and free-form, §7/§8) | **OFFLINE** | Stored locally. |
| Settings / preferences (§6) | **OFFLINE** | Stored locally; take effect without a network call. |
| Encrypted backup creation (§14) | **OFFLINE** | Local operation; no cloud upload. |
| Backup import / validation / restore (§14) | **OFFLINE** | Local operation; works from a file the user provides, regardless of connectivity. |
| Mobile number registration (§5.1) | **ONLINE_REQUIRED** | Cannot be queued or deferred — must fail clearly if offline. |
| OTP/SMS verification (§5.2) | **ONLINE_REQUIRED** | Delivery and verification both require connectivity. |
| Referral code validation (§5.1) | **ONLINE_REQUIRED** | Must be validated server-side (Phase 0 Decision 2); cannot be validated offline. |
| Login (mobile number + OTP) on a new/unrecognized session (§5.3) | **ONLINE_REQUIRED** | Same OTP dependency as registration. |
| Recording the registered mobile number / referral relationship (§5.1, §6) | **ONLINE_REQUIRED** | Happens as part of the registration call. |
| Continued use of an already-authenticated session (§5.3) | **OFFLINE** | Once logged in, staying logged in and using the app does not require connectivity. |
| In-app notification history (§13) | **OFFLINE** | Local history, independent of delivery mechanism. |
| Manual backup transfer to another device (§14) | **OFFLINE / ONLINE_OPTIONAL** | The transfer mechanism itself (e.g. cable, local file share, a cloud drive the user personally chooses) is the user's choice and outside the app's control; the app's own create/import/restore steps are OFFLINE regardless of how the file physically moved. |

**[BUSINESS RULE]** No workflow classified OFFLINE above may be silently
downgraded to require connectivity by a later implementation decision without
this document being amended first.

## 5. Authentication — Functional Requirements

### 5.1 Registration
- **[CONFIRMED — ONLINE_REQUIRED, §4a]** Registration as a whole requires
  connectivity — mobile number recording, OTP verification, and referral
  validation are all part of the account/referral online surface (Phase 0
  Decision 4). If the device is offline, registration must fail with a clear,
  specific message identifying that connectivity is required — never a
  generic or misleading error, and never a silently queued "will register
  later" state.
- **[CONFIRMED]** Registration requires exactly three inputs: mobile number, a
  verified OTP, and a valid referral code. All three are mandatory; none may be
  skipped or bypassed.
- **[BUSINESS RULE]** The referral code must belong to an existing, active user
  account at the time of use. An unknown, expired, revoked, or malformed code is
  rejected with a clear, specific error (distinguish "invalid format" from
  "not found" from "already used," per §19.2 reuse policy).
- **[BUSINESS RULE]** Self-referral (a code referring the same identity that is
  registering) is rejected. **[OPEN-ARCH]** the exact identity signal used to
  detect "same identity" before an account exists (e.g. matching mobile number
  against the referrer's own number) is a Phase 3 design detail.
- **[OPEN-ARCH]** Whether a referral code may be reused by multiple new
  registrants, or is single-use, is a business-rule decision PRODUCT.md leaves
  open ("if business rules prohibit reuse"). Flagged in §19.2 for a product
  decision before Phase 4 schema work.
- **[BUSINESS RULE]** Abuse/manipulation prevention: the system must resist
  scripted mass-registration using a single leaked referral code (rate limiting
  expectations, §12), and must not allow a referral code's validity or the
  identity of its owner to be discoverable through client-observable timing or
  error-message differences beyond what's needed for a legitimate user to
  self-correct a typo.

### 5.2 OTP Verification
- **[CONFIRMED — ONLINE_REQUIRED, §4a]** A one-time code is sent to the
  provided mobile number and must be verified before registration/login
  completes; both delivery and verification require connectivity by nature —
  there is no offline OTP path.
- **[BUSINESS RULE]** OTP codes expire after a short, product-defined window and
  are single-use. **[ASSUMPTION]** default expiry of 5 minutes and a maximum of
  5 verification attempts per issued code before requiring a new code — to be
  confirmed by the project owner, not treated as final.
- **[BUSINESS RULE]** Repeated OTP requests for the same number must be rate
  limited to prevent SMS-bombing/cost abuse.
- **[OPEN-ARCH]** The SMS/OTP provider and backend implementation remain an
  explicit open decision (Phase 0 Decision 2) — not selected here.

### 5.3 Login / Session
- **[CONFIRMED — OFFLINE, §4a]** Once a session exists on a device, continued
  use of the app (all business-data workflows) does not require connectivity
  again. Only establishing a *new* session (login with OTP, e.g. after
  explicit logout or on a new device) is ONLINE_REQUIRED.
- **[CONFIRMED]** Returning users authenticate with mobile number + OTP
  (no separate password is introduced anywhere in PRODUCT.md; none is assumed
  here). **[ASSUMPTION]** — if a lower-friction re-login method (e.g. device
  biometric unlock backed by a previously established session) is wanted, that
  is an enhancement to flag for product-owner confirmation, not assumed as
  in-scope for v1.
- **[BUSINESS RULE]** A session must be able to expire and be revoked (e.g. on
  logout, or suspected compromise). **[OPEN-ARCH]** session lifetime, refresh
  strategy, and multi-device session behavior are Phase 3 decisions.
- **[BUSINESS RULE]** Repeated failed login/OTP attempts must be rate-limited
  and, past a threshold, temporarily lock further attempts for that number.

### 5.4 Logout / Account Lifecycle
- **[CONFIRMED]** A user can log out, ending their local session.
- **[BUSINESS RULE]** A user can request account deactivation/deletion.
  **[OPEN-ARCH]** exact data-retention behavior (immediate hard delete vs.
  soft-delete/grace period, and what happens to that user's outstanding
  referral relationships and any data other users' files reference) is not
  specified in PRODUCT.md and must be confirmed — flagged in §19.6.
- **[BUSINESS RULE]** Logging out must not destroy locally stored encrypted
  data needed for the next login on the same device unless the user explicitly
  chooses to clear local data (distinct action from logout).

## 6. User Profile — Functional Requirements

- **[CONFIRMED]** Profile stores user information (name, mobile number, any
  other product-defined fields), the user's own referral code (for sharing),
  and their referral relationship (who referred them, read-only after
  registration).
- **[CONFIRMED]** Profile settings include notification preferences (which
  notification types are enabled, e.g. reminder notifications vs. system
  notifications — channel selection is §9) and backup preferences (automatic
  backup on/off, frequency — mechanism is §13).
- **[BUSINESS RULE]** A user can view how many people they have referred
  (count), consistent with the referral-ownership model in §5.1, without
  exposing those referred users' private data beyond what's needed to confirm
  the relationship exists.
- **[ASSUMPTION]** Mobile number is not user-editable after verification
  without re-running OTP verification on the new number — to prevent silent
  account takeover via profile edit. To be confirmed.

## 7. Owner Files — Functional Requirements

- **[CONFIRMED]** Create an owner/property file with structured fields (see
  §7.1) plus free-form and internal notes (§7.2).
- **[CONFIRMED]** Edit any field of an existing owner file, with changes
  reflected immediately in search/matching.
- **[CONFIRMED]** View a single owner file's full detail, including its
  structured data, notes, linked contracts (if any), and current match
  candidates.
- **[CONFIRMED]** Search and filter owner files (see §10).
- **[CONFIRMED]** Archive an owner file (removes it from active search/matching
  without deleting it) and restore it from archive.
- **[CONFIRMED]** Delete an owner file, requiring destructive-action
  confirmation (§4), with a clear statement of what deletion affects (e.g.
  linked contracts, historical matches).

### 7.1 Structured, searchable fields (shared philosophy with applicant files)
- **[CONFIRMED]** property type, transaction type (e.g. sale/rent), location,
  neighborhood, area, bedrooms, floor, building floors, parking, storage,
  elevator, pool, price, payment conditions, property condition, amenities.
- **[BUSINESS RULE]** These fields must be structured (typed/enumerated/
  numeric/geographic), not free text, because the matching engine depends on
  querying them directly (Phase 0 Decision 3; PRODUCT.md's explicit "do not
  rely on free-text for critical matching logic").

### 7.2 Non-matching content
- **[CONFIRMED]** Free-form description (user-facing, e.g. for
  sharing/marketing the property) and internal notes (agent-only, never
  surfaced to an applicant-facing view if one ever exists) are stored
  separately from structured fields and are **not** inputs to the matching
  engine's scoring (§9).

## 8. Applicant Files — Functional Requirements

- **[CONFIRMED]** Create an applicant/requirement file with structured,
  prioritized matching criteria (see §8.1), preferences, restrictions/
  exclusions, and free-form/internal notes — same create/edit/view/search/
  filter/archive/delete lifecycle as owner files (§7), for a consistent
  data-entry philosophy across both file types.
- **[CONFIRMED]** Edit, view, search, filter, archive, and delete an applicant
  file with the same behavior and confirmation rules as §7.

### 8.1 Structured matching criteria
- **[CONFIRMED]** Every criterion an applicant cares about (property type,
  location, area, bedrooms, price, amenities such as pool/elevator/parking,
  etc. — the same field vocabulary as §7.1) can be assigned one of four
  priority levels: **MUST_HAVE, IMPORTANT, PREFERRED, IGNORE** (Phase 0
  Decision 3).
- **[BUSINESS RULE]** MUST_HAVE criteria are hard constraints: a property
  failing a MUST_HAVE criterion is not a valid match regardless of how well it
  scores elsewhere. IGNORE criteria are excluded from scoring entirely — not
  merely down-weighted.
- **[CONFIRMED — worked example]** "Pool is essential. Bedrooms, area, and
  price are not important if the property has a pool" must be representable
  directly as structured data: `pool = MUST_HAVE`, `price = IGNORE`,
  `area = IGNORE`, `bedrooms = IGNORE` — not inferred at match-time from a
  free-text note. The requirement-entry UX must let a user reach this exact
  structured state without writing prose (§14 covers the UX expectation; if
  natural-language input is offered as a convenience, it must convert to this
  same structured form and be shown to the user for confirmation before it
  affects matching — never applied silently).
- **[CONFIRMED]** Restrictions/exclusions (e.g. "not ground floor," "no
  properties above a given price") are structured and distinct from
  preferences (nice-to-have direction, e.g. "prefers a balcony") and from
  MUST_HAVE/IMPORTANT/PREFERRED/IGNORE priority tagging of the core criteria
  fields — restrictions are hard exclusion rules, preferences are
  scoring-influencing but non-blocking.
- **[CONFIRMED]** Free-form notes and internal notes exist for applicant files
  exactly as in §7.2, and are likewise excluded from the matching engine's
  scoring input.

## 9. Matching — Functional Requirements

This section defines *product-level behavior* the matching engine must exhibit.
The scoring algorithm's internal design belongs in `/docs/matching/*.md`
(later phase); this document defines what must be true, not how it is computed
internally.

- **[CONFIRMED]** The core matching engine works entirely without any AI
  API — deterministic and rule-based, evaluating structured fields against
  structured requirements (Phase 0 Decision 3, restated as a hard requirement
  here). A requirement written as "AI decides whether two files match" is
  explicitly disallowed and does not appear anywhere in this document.
- **[CONFIRMED]** Matching considers, per criterion: MUST_HAVE, IMPORTANT,
  PREFERRED, IGNORE priority; hard constraints; exclusions; numeric ranges
  (e.g. price between X and Y); exact values (e.g. exact bedroom count);
  approximate values (e.g. "around 90 sqm," with a defined tolerance);
  location matching (neighborhood/area/proximity); amenities; and preferences,
  combined into a weighted score.
- **[CONFIRMED]** A property that fails any MUST_HAVE criterion of an
  applicant is excluded from that applicant's match results outright,
  regardless of its score on other criteria. A criterion set to IGNORE never
  causes exclusion and never contributes to the score.
- **[CONFIRMED]** Every match result includes: an overall score, the list of
  matching criteria, the list of mismatching criteria, the list of ignored
  criteria, which of the applicant's requirements were critical (MUST_HAVE),
  and a human-readable explanation of why the match was recommended. A bare
  numeric score with no explanation is not an acceptable result (Phase 0
  Decision 3, PRODUCT.md's explicit "no mysterious 92% match").
- **[CONFIRMED]** Matching is two-way: starting from an applicant file, the
  user can see ranked candidate properties; starting from an owner/property
  file, the user can see ranked candidate applicants. Both directions use the
  same underlying deterministic engine and produce the same kind of
  explainable result.
- **[CONFIRMED]** If natural-language input is ever used to help an applicant
  express requirements, it is strictly an optional convenience layer that
  converts free text into the same structured requirement representation
  described in §8.1, subject to user review/confirmation before it is used for
  matching. It is never a substitute for, or a required dependency of, the
  core matching engine, and the product must remain fully usable — including
  full matching — with this layer entirely absent (Phase 0 Decision 3).
- **[OPEN-ARCH]** The precise scoring formula (how weights combine IMPORTANT
  vs. PREFERRED criteria, how "approximate" tolerance is calculated, how ties
  are broken) is not defined here — it belongs in `/docs/matching/scoring.md`,
  a later, dedicated phase.

## 10. Search and Filtering — Functional Requirements

- **[CONFIRMED]** Global search across owner files, applicant files, and
  contracts from a single entry point, returning results grouped or clearly
  labeled by type.
- **[CONFIRMED]** Contextual search within a given list (owner files list,
  applicant files list, contracts list) scoped to that type.
- **[CONFIRMED]** Filtering on the same structured fields used for matching
  (§7.1/§8.1) — property type, location, price range, bedrooms, amenities,
  etc. — plus file status (active/archived) and, for contracts, status
  (active/expiring soon/expired/renewed).
- **[CONFIRMED]** Sorting (e.g. by price, by date added, by expiration date for
  contracts, by match score where applicable).
- **[BUSINESS RULE]** Saved filters are supported where a filter combination is
  likely to be reused often (e.g. an agent's standing "2BR apartments under
  budget X in neighborhood Y" filter) — **[ASSUMPTION]** exact scope of which
  filters are savable is left open for Phase 2 user-story detail, not fully
  specified here.
- **[CONFIRMED]** Search/filter must feel fast — see §15 for the measurable
  expectation — and must work against locally available data when offline
  (§14), returning results scoped to whatever data has been synced to the
  device, with a clear indication when results might be incomplete due to
  being offline.

## 11. Contracts — Functional Requirements

- **[CONFIRMED]** Create a contract linking an owner, a tenant, and a
  property, with a start date and an expiration date.
- **[CONFIRMED]** Track renewal status (e.g. not yet due, in renewal
  discussion, renewed, not renewing/ended) and follow-up status (e.g. no
  follow-up needed yet, follow-up due, follow-up completed).
- **[CONFIRMED]** Store notes on a contract, separate from the structured
  status fields.
- **[CONFIRMED]** Maintain contract history — prior state changes (status
  transitions, renewal events) remain visible, not overwritten silently.
- **[BUSINESS RULE]** A contract's tenant is represented consistently with how
  applicant data is modeled elsewhere (§8) where the tenant is an existing
  applicant file; **[ASSUMPTION]** a tenant who is not an existing applicant
  file in the system can still be recorded minimally on the contract — to be
  confirmed, since PRODUCT.md does not require every tenant to have a full
  applicant file.

## 12. Reminders — Functional Requirements

- **[CONFIRMED — OFFLINE, §4a]** Reminder scheduling and expiration
  calculations are computed entirely from locally stored contract data and
  require no connectivity; delivery uses local device notifications (§13,
  Phase 0 Decision 4), not push.
- **[CONFIRMED]** Automatic reminders are generated as a contract approaches
  expiration, on a default schedule of **90, 60, 30, 14, 7, 3 days before, and
  on the expiration day itself.**
- **[CONFIRMED]** This schedule is configurable — the product must allow the
  default offsets to be changed (globally and/or per contract —
  **[ASSUMPTION]**: global default configurable in settings, with
  per-contract override left as an open scope question for §19.2).
- **[BUSINESS RULE]** Reminders are idempotent: a background job that runs
  more than once for the same contract/offset must never create or deliver a
  duplicate reminder to the user.
- **[CONFIRMED]** A reminder, once triggered, feeds into the notification
  system (§13) and updates the contract's follow-up status trail (§11).
- **[BUSINESS RULE]** Reminders must account for a contract's renewal status —
  a contract already marked "renewed" or "ended" must not continue generating
  expiration reminders against its original expiration date.

## 13. Notifications — Functional Requirements

- **[CONFIRMED — OFFLINE, §4a]** In-app notifications (visible within the app,
  e.g. a notification center/inbox) are supported and require no connectivity.
- **[CONFIRMED — OFFLINE, §4a — updated after initial Phase 1 documentation]**
  Contract expiration reminders (§12) are delivered via the device's **local
  notification mechanism**, not push notifications requiring a server
  round-trip (Phase 0 Decision 4). This removes push-delivery infrastructure
  as a dependency for the reminder workflow specifically — a local
  notification is scheduled on-device from locally computed reminder dates
  and fires even with no connectivity at all.
- **[CONFIRMED]** Reminder notifications (from §12) are one category; the
  product must support other system notification categories as they arise
  (e.g. backup completed/failed) without assuming a closed, fixed list. Any
  category tied purely to local events (reminders, backup completed/failed,
  restore completed/failed) is OFFLINE by the same reasoning as reminders. A
  category that would only make sense in response to a server-side event does
  not exist in this version, since there is no server-side business-data
  event source (Phase 0 Decision 4) — **push notifications are not required
  for v1** and are not assumed to exist as infrastructure.
- **[CONFIRMED]** Notification preferences (per §6) let a user control which
  categories they receive, consistent with the local-only delivery mechanism
  above.
- **[CONFIRMED]** Each notification has read/unread state, and a history of
  past notifications is retained and browsable, not just the most recent one.
- **[BUSINESS RULE]** Failure to deliver a local notification (e.g. the OS
  denies notification permission, or a scheduled local notification is missed
  because the device was off) must be handled with a defined fallback — at
  minimum, the notification must still appear in the in-app history (§NOTIF
  stories) so the user is not solely dependent on the local notification
  firing successfully. **[OPEN-ARCH]** exact OS-level scheduling mechanism is
  a Phase 3 detail; this requirement only establishes the fallback behavior.

## 14. Backup — Functional Requirements

- **[CONFIRMED — OFFLINE, §4a]** Backup creation, import, validation, and
  restore are all local operations requiring no connectivity (Phase 0
  Decision 4). **No cloud backup is required** — the product does not depend
  on any remote storage service to create, hold, or restore a backup.
- **[CONFIRMED]** Backups are encrypted and integrity-protected — a corrupted
  or tampered backup must be detectable, not silently restored as if valid.
- **[CONFIRMED]** Both automatic (product-scheduled, per user's backup
  preference from §6) and manual (user-triggered, on demand) backup are
  supported, both entirely local operations.
- **[CONFIRMED]** Export produces a portable backup file the user can store
  anywhere and move off the device by any means of their choosing (e.g. cable
  transfer, local file share, or a cloud drive the user personally selects —
  the app itself does not require or manage any such destination);
  import/restore consumes that file back into the app, including on a
  different device than it was created on, as an **explicit, user-initiated**
  action — never an assumed or automatic transfer.
- **[CONFIRMED]** Restoring a backup validates it first (integrity check,
  version compatibility) before applying it, and clearly reports:
  - a corrupted/tampered backup (cannot be restored),
  - an incorrect password/key (cannot be decrypted — must not be confused
    with "corrupted" in the message shown to the user, since the causes and
    user actions differ),
  - a backup from an incompatible/older version (must define whether it's
    migrated forward or rejected with a clear reason).
- **[BUSINESS RULE]** Backup version compatibility must be handled explicitly
  going forward — every backup format change must remain readable by a defined
  compatibility policy (e.g. "current version + N prior versions"), not
  silently break old backups. **[OPEN-ARCH]** the exact versioning/migration
  policy belongs in `/docs/backup/backup-specification.md`.
- **[OPEN-ARCH]** The encryption algorithm, key derivation, and key-management
  approach are explicitly **not** selected in this document (per instruction);
  they belong in `/docs/security/encryption.md` (later phase). This document
  only asserts that backups must be encrypted, integrity-protected, and that
  wrong-key/corruption must be distinguishable and handled gracefully.
- **[CONFIRMED — FINAL product decision, added after Phase 1 sign-off]**
  Restoring onto a device that already has existing local business data
  **must never silently overwrite it**. The required sequence is:
  1. Detect that existing local business data is present on the device.
  2. Clearly warn the user that restoring will replace it.
  3. Require a safety backup of the device's *current* data to be created
     successfully before any destructive replacement — if the safety backup
     cannot be completed, the restore does not proceed.
  4. Validate the safety backup.
  5. Require explicit, unambiguous confirmation from the user before
     replacing the existing local dataset (e.g. "Restore & Replace," never a
     bare "OK" — Phase 1 §4/§16's destructive-confirmation requirement
     applies here specifically).
  6. Only then perform the restore, after both validation and confirmation
     have completed successfully.
  7. The user must be able to cancel at any point before step 6 without any
     modification to the existing local data.
  This resolves what was previously recorded as an open architectural
  question ("overwrite vs. block-until-confirmed") — the answer is neither
  a silent overwrite nor a hard block, but a mandatory safety-backup-then-
  explicit-replace flow. The exact technical mechanism (staging, atomic
  swap) remains governed by `/docs/backup/backup-architecture-analysis.md`'s
  "safe rollback if restore fails" requirement, which this decision extends
  to cover the pre-restore safety backup as well.

## 15. Offline — Functional Requirements

**[CONFIRMED — Phase 0 Decision 4, added after initial Phase 1 documentation]**
This section was originally framed as "resilience to poor connectivity" for an
otherwise server-dependent app. It has since been sharpened: the application is
**local-first/offline-first by design**, not merely tolerant of connectivity
loss. Business data has no required server counterpart at all (§4a). The
distinction matters: this is not "the app degrades gracefully when offline," it
is "the app's normal operating mode is offline, with a small, clearly bounded
online surface for account/referral operations."

- **[CONFIRMED]** All locally stored data (owner files, applicant files,
  contracts, match results, notifications, settings) remains fully viewable,
  searchable, and editable while offline — this is not a degraded or
  read-only mode, it is the application's normal mode of operation.
- **[CONFIRMED]** Creating and editing business data (owner/applicant files,
  contracts, notes, running matching) works fully offline and is saved
  locally — there is no "will sync later" pending state for business data,
  because business data has no required remote counterpart to sync to (§4a).
- **[BUSINESS RULE]** The only actions that inherently require connectivity
  are the account/referral operations in §4a's ONLINE_REQUIRED row (mobile
  number registration, OTP verification/delivery, referral code validation,
  and establishing a new login session). These must fail clearly, explain
  specifically that they require connectivity, and be retryable — never
  appear to silently succeed, and never be silently queued as if they could
  complete offline.
- **[CONFIRMED]** There is **no requirement for multi-device cloud
  synchronization**. The product must not assume records are synchronized
  between devices. If a user moves to another device, that is handled solely
  via the explicit, user-controlled manual backup export/transfer/restore
  flow in §14 — a one-time, user-initiated data transfer, not continuous
  background sync.
- **[BUSINESS RULE]** Because there is no assumed multi-device sync of
  business data, there is correspondingly **no requirement for automatic
  conflict resolution, CRDTs, real-time sync, or cloud replication
  infrastructure** for business data. A restore from a backup on a new device
  is expected to establish that device's local dataset from the backup (an
  explicit, user-understood operation, not a silent merge) — "silently and
  invisibly merge two divergent datasets" is explicitly out of scope unless a
  future product decision requires it. **[CONFIRMED — FINAL, resolved]** The
  behavior when a device already has local data at restore time is neither a
  silent overwrite nor an indefinite block: it is the mandatory
  safety-backup-then-explicit-replace sequence specified in §14 (detect →
  warn → safety backup → validate → explicit confirm → restore → verify) —
  see §14 for the full sequence, which is authoritative.

## 16. UX Requirements

Measurable/product-level, not implementation-specific:

- **[CONFIRMED]** One-handed use: primary actions (create file, search, view
  match, mark reminder handled) must be reachable without requiring the user's
  other hand, consistent with thumb-reach zones on a typical phone.
- **[CONFIRMED]** Fast navigation: moving between core screens (list ↔ detail
  ↔ related record) should not require more taps than necessary, and
  navigation state should be predictable (back always returns to the expected
  prior screen).
- **[CONFIRMED]** Minimal data entry: structured fields use smart defaults,
  autocomplete, and chip/selection-based input over free typing wherever the
  field is enumerable (property type, amenities, priority level).
- **[CONFIRMED]** Every important screen supports, where applicable: loading,
  empty, success, error, offline, and retry states (PRODUCT.md's explicit
  list) — a screen that only handles the "happy path" is incomplete.
- **[CONFIRMED]** Optimistic UI is used where the action is very likely to
  succeed and safely reversible (e.g. toggling a notification's read state);
  it is not used where an incorrect optimistic result could mislead the user
  about matching or contract state.
- **[CONFIRMED]** Autosave is used for in-progress file edits so a user is
  never at risk of losing entered data due to navigating away or a dropped
  connection, consistent with the offline requirements in §15.
- **[CONFIRMED]** Touch targets meet standard mobile accessibility sizing;
  gestures (e.g. swipe-to-archive on a list row) are predictable and always
  paired with a non-gesture equivalent (button/menu action) for discoverability
  and accessibility.
- **[CONFIRMED]** Destructive operations (delete file, delete contract,
  overwrite via restore) always show a clear, specific confirmation — but
  confirmations are not used redundantly for safe/reversible actions
  (PRODUCT.md's explicit "avoid ... redundant confirmation").
- **[BUSINESS RULE]** Accessibility (sufficient contrast, readable type sizes,
  screen-reader-compatible structure for at least core flows) is a baseline
  requirement, not a stretch goal, even though PRODUCT.md does not enumerate a
  specific accessibility standard to target. **[ASSUMPTION]** — target
  standard (e.g. WCAG 2.1 AA) is not specified in PRODUCT.md and should be
  confirmed.

## 17. Performance Requirements

Product-level expectations; specific numeric targets are stated as
**[ASSUMPTION]** starting points for discussion, not committed SLAs, since
PRODUCT.md asks for measurement-driven optimization rather than premature
numeric targets:

- **[CONFIRMED]** Startup, navigation, search, file-list rendering, matching,
  database operations, and backup/restore must all be fast enough that the
  user does not perceive the app as sluggish on typical field-use hardware and
  network conditions — measured and iterated on, not guessed.
- **[ASSUMPTION]** Illustrative (non-binding) starting targets for later
  validation: cold start to interactive well under 2s on typical hardware;
  list scroll/search-as-you-type feels instantaneous (no visible input lag);
  matching against a realistic single-agent dataset completes fast enough to
  feel synchronous (no spinner needed for the common case). These are
  discussion starting points, not commitments.
- **[CONFIRMED]** Large datasets (an agent's full multi-year file/contract
  history) must not degrade list rendering or search to the point of being
  unusable — this must be validated, not assumed away, once real data volumes
  are known.
- **[CONFIRMED]** Memory and network usage must stay reasonable for a mobile
  device operating on constrained/metered connections, consistent with the
  offline-resilience goal (§15) — the app should not depend on constant
  network chatter to remain usable.
- **[OPEN-ARCH]** Specific technical optimization strategies (indexing
  approach, caching layer, pagination technique) are explicitly not selected
  here — see Phase 0 §11a for tracked risks that Phase 3/4 must resolve.

## 18. Security Requirements

Product-level; implementation is covered in `/docs/security/threat-model.md`
and `/docs/security/authentication.md` (later phase):

- **[CONFIRMED]** Authentication security: OTP-based, rate-limited, with
  brute-force and replay resistance for both OTP verification and referral
  code validation.
- **[CONFIRMED]** Authorization: a user can only view/modify their own owner
  files, applicant files, contracts, and profile — no cross-user data access.
  **[ASSUMPTION]** — this assumes single-agent-owns-their-data with no
  team/shared-file model (see §2's open user-type question); if team sharing
  is wanted, authorization requirements expand significantly and must be
  re-scoped.
- **[CONFIRMED]** Referral abuse prevention per §5.1 (self-referral, code
  reuse policy, mass-registration resistance).
- **[CONFIRMED]** Sensitive data protection: mobile numbers, OTP codes,
  session tokens, and backup encryption keys are never logged in plaintext and
  never committed to source control (Phase 0 §6 finding — must be enforced
  going forward, not just avoided so far).
- **[CONFIRMED]** Local data protection: data stored on-device must not be
  trivially readable outside the application (e.g. as a plain readable file by
  another app or a casual inspection of device storage) — exact mechanism is
  open (§19.3). This matters more, not less, under the local-first model
  (Phase 0 Decision 4), since business data lives exclusively on-device with
  no server-side copy.
- **[CONFIRMED]** Backup protection: encrypted and integrity-checked per §14.
- **[CONFIRMED]** Network security: all network communication is limited to
  the account/referral surface (§4a) — OTP delivery/verification and referral
  validation — and uses transport encryption (HTTPS/TLS), with no plaintext
  transmission of sensitive data. There is no other network communication to
  secure, since business data is never transmitted over the network in normal
  operation (Phase 0 Decision 4).
- **[CONFIRMED]** Session security: sessions can be revoked (§5.3); session
  material is protected consistently with other sensitive data above.
- **[CONFIRMED]** Auditability: security- and data-relevant actions (login,
  referral use, file deletion, backup restore) are recorded in a way that
  supports later investigation, consistent with the `AuditLog` entity flagged
  in Phase 0 §11a — exact scope of what's audited is a Phase 3/4 detail.
- **[CONFIRMED]** Rate limiting expectations apply to OTP requests, login/OTP
  verification attempts, and referral-code validation attempts, per §5.

---

## 19. Summary

### 19.1 Confirmed decisions
- Mobile-app platform (Phase 0 Decision 1); final RN vs. Capacitor choice
  deferred to Phase 3.
- Registration requires mobile number + OTP + mandatory, server-side-validated
  referral code; self-referral, invalid, and duplicate codes are prevented
  (§5).
- Matching engine is deterministic, rule-based, AI-independent, supports
  MUST_HAVE/IMPORTANT/PREFERRED/IGNORE and the full criteria list in §9, and
  always returns an explainable result; AI, if ever added, is a strictly
  optional natural-language-to-structured-requirements convenience layer
  (Phase 0 Decision 3).
- Owner and applicant files share a consistent structured-field philosophy,
  with structured/matching data kept separate from free-form/internal notes
  (§7, §8).
- Contract reminders follow the 90/60/30/14/7/3/0-day default schedule,
  configurable, and must be idempotent (§12).
- Backups must be encrypted, integrity-protected, portable, and support
  export/import/restore/cross-device transfer; encryption algorithm and key
  management are explicitly deferred (§14). Backup is a **local, exportable**
  feature — no cloud backup is required (Phase 0 Decision 4).
- **[Added after initial Phase 1 documentation]** The application is
  local-first/offline-first: normal business operation (all of §7–§15 except
  the account/referral surface) requires no connectivity at all, not merely
  "resilience" to poor connectivity. Network access is limited to mobile
  number registration, OTP verification, and referral code validation (§4a,
  Phase 0 Decision 4).
- **[Added after initial Phase 1 documentation]** There is no cloud
  synchronization of business data, no cloud database for business data, no
  cloud matching, and no cloud backup requirement. No CRDT/real-time-sync/
  cloud-replication infrastructure is required unless a future product
  decision changes this (§15).
- **[Added after initial Phase 1 documentation]** Contract reminders are
  delivered via local device notifications, not push notifications — push
  infrastructure is not required for v1 (§13).
- **[FINAL — added after Phase 3/UI correction round]** The seven default
  reminder offsets are fixed: 90, 60, 30, 14, 7, 3 days before expiration,
  and **on the expiration date itself** ("On Expiration"). "1 day before" is
  explicitly not the seventh default (§12).
- **[FINAL — added after Phase 3/UI correction round]** Restoring onto a
  device with existing local business data must never silently overwrite it;
  the mandatory sequence is detect → warn → safety backup → validate →
  explicit "Restore & Replace" confirmation → restore → verify (§14).

### 19.2 Open product decisions
- Whether referral codes are single-use or reusable (§5.1).
- Exact account-deletion/deactivation data-retention behavior (§5.4).
- Whether reminder schedule configurability is global-only or also
  per-contract (§12).
- Whether multi-agent/team accounts or an admin role are in scope (§2).
- Target accessibility standard (§16).
- ~~Whether multiple devices per user (and thus true sync conflicts) are
  supported in v1~~ — **resolved** by Phase 0 Decision 4: v1 does not assume
  multi-device cloud sync; cross-device movement is via explicit manual
  backup transfer only (§15).

### 19.3 Open architectural decisions
- React Native vs. Capacitor (Phase 0 §Decision 1 addendum) — Phase 3.
- OTP/SMS provider and backend (Phase 0 Decision 2) — Phase 3.
- Encryption algorithm, key derivation, key management (§14) —
  `/docs/security/encryption.md`.
- Local storage technology and on-device data-protection mechanism (§15, §18)
  — Phase 3, now the sole data store rather than a cache (Phase 0 Decision 4).
- ~~Behavior when restoring a backup onto a device that already has local
  data~~ — **resolved, FINAL**: mandatory safety-backup-then-explicit-replace
  sequence, see §14. The remaining open item is only the technical staging/
  atomic-swap mechanism, not the policy.
- Local notification scheduling mechanism for reminders (§13) — Phase 3.
- Matching engine's internal scoring formula (§9) — `/docs/matching/*.md`.
- Final database schema (all entities) — Phase 4.

### 19.4 Assumptions requiring later validation
- Single user type (Agent/Broker); no separate admin or owner/applicant login
  (§2).
- OTP default expiry/attempt limits (§5.2) are illustrative, not final.
- Mobile number is not self-editable without re-verification (§6).
- Tenant-without-applicant-file minimal recording is allowed on a contract
  (§11).
- Illustrative, non-binding performance targets (§17).
- ~~Single-device-per-user as the default assumption pending §19.2's open
  decision~~ — **resolved**: no multi-device cloud sync is assumed by design
  (Phase 0 Decision 4), not merely as a default pending confirmation.

### 19.5 Risks
- If multi-agent/team data sharing turns out to be required, the
  single-owner authorization model (§18) and much of the file/contract
  data model would need rework before Phase 4 is final.
- If referral codes must be reusable, self-referral/duplicate-prevention logic
  (§5.1) needs a different uniqueness model than "one code, one use."
- Backup/security requirements here are deliberately implementation-free;
  until `/docs/security/encryption.md` exists, "encrypted and
  integrity-protected" is a promise, not a verified design (carried from Phase
  0 §8a). This risk is unchanged by Decision 4, and arguably higher priority
  now: since business data lives exclusively on-device with no server-side
  copy, the local encryption/key-management design is the primary protection
  for that data, not a secondary layer in front of a server-side one.
- If a future product decision does introduce multi-device cloud sync, the
  offline requirements in §15 will need to be revisited — this document
  deliberately does not build in unused conflict-resolution infrastructure
  ahead of that need, so adding it later is new work, not a reactivation of
  something already designed.

### 19.6 Questions requiring product-owner input
1. Is this a single-agent tool, or must it support teams/admins sharing data?
2. Should referral codes be single-use or reusable?
3. What should happen to a user's data and outstanding referral relationships
   on account deletion?
4. Is there a target accessibility standard (e.g. WCAG 2.1 AA) to design
   against?
5. Should the reminder schedule be configurable per contract, or only as a
   single global default?

~~Is multi-device use (same account, two phones, syncing) in scope for v1~~ —
**answered** by the local-first/offline-first decision: no, not for v1;
cross-device movement is via explicit manual backup/restore only.
