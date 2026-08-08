# 01 — Product Requirements

Status: DRAFT — Phase 1. Builds on the approved Phase 0 findings in
`/docs/00-project-overview.md` (§2a confirmed decisions). No application code
has been written. No implementation-level decisions (RN vs. Capacitor, OTP
provider, encryption algorithm, matching engine internals, final DB schema) are
made in this document — see §16 for what remains explicitly open.
Date: 2026-08-08

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
  in it requires one either. Flagged in §16.

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
7. **[CONFIRMED]** Back up data (manual and automatic), export/transfer it to
   another device, and restore it, with encryption and integrity protection
   whose exact mechanism is still open (§16).
8. **[CONFIRMED]** Receive and manage notifications (reminders, system events)
   in-app and via push, with read/unread state and a history.

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

## 5. Authentication — Functional Requirements

### 5.1 Registration
- **[CONFIRMED]** Registration requires exactly three inputs: mobile number, a
  verified OTP, and a valid referral code. All three are mandatory; none may be
  skipped or bypassed.
- **[BUSINESS RULE]** The referral code must belong to an existing, active user
  account at the time of use. An unknown, expired, revoked, or malformed code is
  rejected with a clear, specific error (distinguish "invalid format" from
  "not found" from "already used," per §16 reuse policy).
- **[BUSINESS RULE]** Self-referral (a code referring the same identity that is
  registering) is rejected. **[OPEN-ARCH]** the exact identity signal used to
  detect "same identity" before an account exists (e.g. matching mobile number
  against the referrer's own number) is a Phase 3 design detail.
- **[OPEN-ARCH]** Whether a referral code may be reused by multiple new
  registrants, or is single-use, is a business-rule decision PRODUCT.md leaves
  open ("if business rules prohibit reuse"). Flagged in §16 for a product
  decision before Phase 4 schema work.
- **[BUSINESS RULE]** Abuse/manipulation prevention: the system must resist
  scripted mass-registration using a single leaked referral code (rate limiting
  expectations, §12), and must not allow a referral code's validity or the
  identity of its owner to be discoverable through client-observable timing or
  error-message differences beyond what's needed for a legitimate user to
  self-correct a typo.

### 5.2 OTP Verification
- **[CONFIRMED]** A one-time code is sent to the provided mobile number and must
  be verified before registration/login completes.
- **[BUSINESS RULE]** OTP codes expire after a short, product-defined window and
  are single-use. **[ASSUMPTION]** default expiry of 5 minutes and a maximum of
  5 verification attempts per issued code before requiring a new code — to be
  confirmed by the project owner, not treated as final.
- **[BUSINESS RULE]** Repeated OTP requests for the same number must be rate
  limited to prevent SMS-bombing/cost abuse.
- **[OPEN-ARCH]** The SMS/OTP provider and backend implementation remain an
  explicit open decision (Phase 0 Decision 2) — not selected here.

### 5.3 Login / Session
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
  specified in PRODUCT.md and must be confirmed — flagged in §16.
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

- **[CONFIRMED]** Automatic reminders are generated as a contract approaches
  expiration, on a default schedule of **90, 60, 30, 14, 7, 3 days before, and
  on the expiration day itself.**
- **[CONFIRMED]** This schedule is configurable — the product must allow the
  default offsets to be changed (globally and/or per contract —
  **[ASSUMPTION]**: global default configurable in settings, with
  per-contract override left as an open scope question for §16).
- **[BUSINESS RULE]** Reminders are idempotent: a background job that runs
  more than once for the same contract/offset must never create or deliver a
  duplicate reminder to the user.
- **[CONFIRMED]** A reminder, once triggered, feeds into the notification
  system (§13) and updates the contract's follow-up status trail (§11).
- **[BUSINESS RULE]** Reminders must account for a contract's renewal status —
  a contract already marked "renewed" or "ended" must not continue generating
  expiration reminders against its original expiration date.

## 13. Notifications — Functional Requirements

- **[CONFIRMED]** In-app notifications (visible within the app, e.g. a
  notification center/inbox) and push notifications (delivered to the device
  even when the app is not open) are both supported.
- **[CONFIRMED]** Reminder notifications (from §12) are one category; the
  product must support other system notification categories as they arise
  (e.g. backup completed/failed) without assuming a closed, fixed list.
- **[CONFIRMED]** Notification preferences (per §6) let a user control which
  categories they receive and through which channel(s).
- **[CONFIRMED]** Each notification has read/unread state, and a history of
  past notifications is retained and browsable, not just the most recent one.
- **[BUSINESS RULE]** Failure to deliver a notification (e.g. push delivery
  failure) must be handled with a defined retry expectation — the product
  must not silently drop a reminder notification because a single delivery
  attempt failed. **[OPEN-ARCH]** exact retry count/backoff and provider are
  not selected here (PRODUCT.md's explicit instruction).

## 14. Backup — Functional Requirements

- **[CONFIRMED]** Backups are encrypted and integrity-protected — a corrupted
  or tampered backup must be detectable, not silently restored as if valid.
- **[CONFIRMED]** Both automatic (product-scheduled, per user's backup
  preference from §6) and manual (user-triggered, on demand) backup are
  supported.
- **[CONFIRMED]** Export produces a portable backup file the user can move off
  the device (e.g. to transfer to a new phone); import/restore consumes that
  file back into the app, including on a different device than it was created
  on.
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

## 15. Offline — Functional Requirements

- **[CONFIRMED]** Previously loaded/synced data (owner files, applicant files,
  contracts, match results, notifications) remains viewable while offline.
- **[CONFIRMED]** Creating and editing data that doesn't inherently require a
  live server round-trip (e.g. adding/editing an owner file, running matching
  against locally available data) works offline and is saved locally, to be
  synchronized when connectivity returns.
- **[BUSINESS RULE]** Actions that inherently require connectivity (e.g. OTP
  delivery, backup upload to a remote destination if one exists) must fail
  clearly and be retryable, not appear to silently succeed.
- **[CONFIRMED]** When connectivity returns, locally saved changes
  synchronize automatically without requiring the user to remember to trigger
  it manually.
- **[BUSINESS RULE]** If the same record was changed both locally (offline)
  and elsewhere (e.g. a prior sync, or — depending on later architecture —
  another device) such that a conflict exists, the product must have a defined
  behavior instead of silently discarding one side's change. **[OPEN-ARCH]**
  the exact conflict-resolution strategy (last-write-wins, user-prompted
  merge, field-level merge, or "single-device only, no conflict possible") is
  explicitly not decided here — this requirement only establishes that
  conflicts must never silently lose data.
- **[ASSUMPTION]** Whether this product supports multiple devices per user
  syncing the same data (which is what makes true conflicts possible in the
  first place) is not yet confirmed — if the initial version is genuinely
  single-device-per-user with cross-device transfer only via explicit
  backup/restore (§14), then "conflict resolution" reduces to "sync between
  the app and any future server component," which is a smaller problem. This
  must be confirmed before Phase 3. Flagged in §16.

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
  open (§16).
- **[CONFIRMED]** Backup protection: encrypted and integrity-checked per §14.
- **[CONFIRMED]** Network security: all network communication (OTP delivery
  trigger, any future sync/server calls) uses transport encryption (HTTPS/TLS)
  — no plaintext transmission of sensitive data.
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
  management are explicitly deferred (§14).
- Offline viewing/editing of locally available data with sync-on-reconnect is
  required; exact sync/conflict architecture is explicitly deferred (§15).

### 19.2 Open product decisions
- Whether referral codes are single-use or reusable (§5.1).
- Exact account-deletion/deactivation data-retention behavior (§5.4).
- Whether reminder schedule configurability is global-only or also
  per-contract (§12).
- Whether multi-agent/team accounts or an admin role are in scope (§2).
- Whether multiple devices per user (and thus true sync conflicts) are
  supported in v1, vs. single-device-plus-backup-transfer only (§15).
- Target accessibility standard (§16).

### 19.3 Open architectural decisions
- React Native vs. Capacitor (Phase 0 §Decision 1 addendum) — Phase 3.
- OTP/SMS provider and backend (Phase 0 Decision 2) — Phase 3.
- Encryption algorithm, key derivation, key management (§14) —
  `/docs/security/encryption.md`.
- Offline sync and conflict-resolution mechanism (§15) — Phase 3.
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
- Single-device-per-user as the default assumption pending §19.2's open
  decision.

### 19.5 Risks
- If multi-agent/team data sharing turns out to be required, the
  single-owner authorization model (§18) and much of the file/contract
  data model would need rework before Phase 4 is final.
- If referral codes must be reusable, self-referral/duplicate-prevention logic
  (§5.1) needs a different uniqueness model than "one code, one use."
- Backup/security requirements here are deliberately implementation-free;
  until `/docs/security/encryption.md` exists, "encrypted and
  integrity-protected" is a promise, not a verified design (carried from Phase
  0 §8a).
- Offline requirements as written do not yet resolve whether real multi-device
  conflicts are possible — writing detailed conflict-resolution user stories
  in Phase 2 is riskier before §19.2's device-count question is answered.

### 19.6 Questions requiring product-owner input
1. Is this a single-agent tool, or must it support teams/admins sharing data?
2. Should referral codes be single-use or reusable?
3. What should happen to a user's data and outstanding referral relationships
   on account deletion?
4. Is multi-device use (same account, two phones, syncing) in scope for v1, or
   is cross-device movement handled only via explicit backup/restore?
5. Is there a target accessibility standard (e.g. WCAG 2.1 AA) to design
   against?
6. Should the reminder schedule be configurable per contract, or only as a
   single global default?
