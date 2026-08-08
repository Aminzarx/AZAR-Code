# Unresolved Architectural Decisions (Phase 3 Consolidated Tracker)

Status: DRAFT — consolidates every open item flagged across the Phase 3
document set into one place, so nothing gets lost between documents. Update
this file whenever an item below is resolved elsewhere.
Date: 2026-08-08 (revised — four items now resolved at the policy level:
local-DB-encryption requirement, session-lifecycle network-vs-auth-failure
rule, default reminder schedule (FINAL), and restore-onto-existing-data
(FINAL); mechanism/implementation details for the first two remain open, see
notes below)

## Platform

- **React Native vs. Capacitor** (ADR-001) — [PROPOSED] React Native, pending
  project-owner confirmation, with team-composition and code-reuse-intent
  called out as inputs this document can't see.

## Local data

- Exact migration tooling/library choice.
- Whether to checksum the live database file for corruption detection beyond
  backup integrity checking.
- ~~Restore-onto-existing-data behavior (block vs. overwrite)~~ — **resolved,
  FINAL** (see Backup / encryption section below — same decision, listed
  there in full).
- Concrete pagination/caching strategy, pending real data volumes.

## Backup / encryption

- Final encryption algorithm and KDF selection — explicitly deferred to a
  dedicated security design step. **[CONFIRMED constraint on this choice]**:
  because a stolen backup file can be brute-forced entirely offline with no
  rate limiting the app can enforce, the KDF must be deliberately slow/
  memory-hard (e.g. Argon2id-class, per
  `/docs/security/threat-model.md`'s brute-force analysis) — this narrows the
  eventual choice without finalizing it.
- Final key-management model — this document [PROPOSED] a hybrid approach
  (device-held key for local at-rest protection + user password-derived key
  for portable backup) but did not finalize it.
- Backup version-compatibility policy (migrate-forward vs. reject window).
- ~~Restore-onto-existing-data behavior (block vs. overwrite)~~ — **resolved,
  FINAL product decision**: restore must never silently overwrite existing
  local business data. Mandatory sequence: detect existing data → warn →
  create a safety backup of current data → validate that safety backup (do
  not proceed if it fails) → require explicit "Restore & Replace"
  confirmation → restore → verify the restored dataset. Cancellation before
  the actual restore step leaves existing data untouched. Recorded in
  `/docs/01-product-requirements.md` §14/§19.1, `/docs/02-user-stories.md`
  RST-06, `/docs/backup/backup-architecture-analysis.md`, and
  `/docs/local-data/local-data-architecture.md`. The UI for this flow is
  already delivered in
  `/design/stitch/stitch_elite_real_estate_crm/restore_existing_data_warning/`
  and its seven sibling restore-state screens. Only the technical staging/
  atomic-swap implementation mechanics remain open, not the policy.
  **[Design gap tracked, not yet closed]**: the delivered
  `restore_existing_data_warning/` screen does not yet show the mandatory
  pre-replace safety-backup step as its own distinct step — it goes straight
  from the warning to the replace confirmation. A follow-up design
  correction pass is needed to add a visible "Creating Safety Backup..."
  step between them before the restore flow is fully aligned with this final
  decision (`/docs/ui/02-stitch-final-correction.md` §F addendum).
- ~~Whether the local database itself should be encrypted at rest~~ —
  **resolved at the policy level**: at-rest encryption of sensitive local
  business data is now a **[CONFIRMED REQUIRED]** security requirement
  (`/docs/security/threat-model.md`, "Local data protection"), not an open
  yes/no question. What remains open is the **mechanism**: the specific
  algorithm and key-management architecture, both **[DEFERRED]** to the
  dedicated security design step (item above, "Final encryption algorithm
  and KDF selection" / "Final key-management model").

## Authentication / OTP

- OTP/SMS provider selection (ADR-003) — explicitly deferred by instruction.
- ~~Session-lifecycle Option A (purely local) vs. Option B (opportunistic
  background re-validation)~~ — **resolved at the policy level**:
  background re-validation MAY be used when online, but a NETWORK FAILURE
  (no connectivity, timeout, temporary server unavailability) must never log
  the user out or block core functionality — only an explicit
  AUTHENTICATION FAILURE response from a reachable server triggers the
  defined security response (`/docs/security/authentication-otp-architecture.md`,
  "The critical local-first rule"). What remains open is the **cadence/
  mechanism**: when and how often the opportunistic check runs, and the local
  session representation used — both **[OPEN-ARCH]**, implementation-phase
  details, not policy questions.
- A remaining, explicitly named (not resolved) security trade-off: a stolen/
  compromised device kept offline retains local session access until it
  reconnects — inherent to any offline-first system, mitigations
  (re-validation cadence, local device unlock/PIN gate) are open and partly
  UX-dependent.
- Exact OTP expiry/attempt-limit values (currently illustrative only, carried
  from Phase 1).
- Exact rate-limiting thresholds for OTP requests/verification/referral
  validation attempts.

## Matching

- Exact scoring formula and weight values (IMPORTANT vs. PREFERRED, partial-
  match tapering) — explicitly deferred pending Phase 4's data model.
- Approximate-value tolerance definition.
- Score normalization/presentation scale.
- Whether/how an optional natural-language input layer is eventually built
  (out of core-engine scope regardless of the answer).

## Contracts / reminders / notifications

- **[CONFIRMED — FINAL, not open]** The seven default reminder offsets are
  fixed: 90, 60, 30, 14, 7, 3 days before expiration, and on the expiration
  date itself ("On Expiration"). Noted here explicitly because an earlier
  correction-round instruction briefly used "1 day before" for the seventh
  offset, which does not match this final decision — recorded so it is never
  reintroduced by mistake.
- Behavior when a newly configured reminder offset is already in the past for
  existing contracts (fire immediately vs. apply to future contracts only).
- Exact local-notification scheduling library/approach (pending ADR-001).
- Handling of platform-imposed pending-notification limits at scale.
- Contract.tenant's exact relationship shape (ApplicantFile-backed vs.
  minimally recorded) — carried from Phase 1 §11, still open.

## Database (conceptual → Phase 4)

- Contract.tenant's exact relationship shape (same item as above, listed here
  for schema-design visibility).
- AuditLogEntry's typed-reference mechanism.
- Notification.source's typed-reference mechanism.
- Whether RequirementCriterion needs a parallel structure on OwnerFile for
  two-way matching symmetry, or whether that asymmetry (only applicants have
  priorities) is intentional.

## Security / privacy (UX-dependent, tracked here for completeness)

- App-switcher/screenshot obscuring — which screens warrant it, pending UI
  design.
- Clipboard handling for backup password/key entry — pending UI design.

## Product-level (carried from Phase 1/2, still open — not re-opened by Phase 3, listed for completeness)

- Single-agent tool vs. team/admin accounts (Phase 1 §2/§19.6).
- Referral code single-use vs. reusable (Phase 1 §5.1/§19.2/§19.6).
- Account-deletion/deactivation data-retention behavior (Phase 1 §5.4/§19.6).
- Target accessibility standard (Phase 1 §16/§19.6).
- Reminder schedule configurability: global-only vs. per-contract (Phase 1
  §12/§19.2/§19.6).

## How to use this document

When any item above is resolved (by project-owner decision or a later,
focused design phase), update it here **and** in the source document(s) that
originally flagged it, so the two never drift out of sync. This file is a
tracker, not the authoritative record for any single decision — the
originating document (ADR, architecture doc, or Phase 1/2 requirements doc)
remains authoritative for rationale.
