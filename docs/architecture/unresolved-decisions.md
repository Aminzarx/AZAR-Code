# Unresolved Architectural Decisions (Consolidated Tracker)

Status: DRAFT — consolidates every open item flagged across the full
document set into one place, so nothing gets lost between documents.
Update this file whenever an item below is resolved elsewhere.
Date: 2026-08-08 (revised in the Phase 4 final-architecture pass — the
local-database-technology decision is now FINAL; the backup and
local-database encryption *mechanisms* are now PROPOSED, concrete designs,
no longer fully DEFERRED, though both still require a dedicated security
review before FINAL; several items below are newly marked **PRODUCT OWNER
DECISION REQUIRED** rather than left as generic "open" items, since Phase 4
is architecture's last stop before implementation)

## Platform

- **React Native vs. Capacitor** (ADR-001) — **[PRODUCT OWNER DECISION
  REQUIRED]**. [PROPOSED] React Native, with a documented rationale
  (`ADR-001`), but no project-owner approval has been recorded anywhere in
  this document set. This is the single decision nothing else in
  implementation can proceed past — flagged explicitly, not silently
  carried forward as though it were settled.

## Local data

- Exact migration tooling/library choice.
- Whether to checksum the live database file for corruption detection beyond
  backup integrity checking.
- ~~Restore-onto-existing-data behavior (block vs. overwrite)~~ — **resolved,
  FINAL** (see Backup / encryption section below — same decision, listed
  there in full).
- Concrete pagination/caching strategy, pending real data volumes.

## Backup / encryption

- ~~Final encryption algorithm and KDF selection~~ — **resolved to
  [PROPOSED], pending dedicated security review** in the Phase 4 pass:
  AES-256-GCM (AEAD) + Argon2id (KDF, 64 MiB / 3 iterations / parallelism 1
  as a starting point). See `ADR-004-backup-encryption.md` and
  `/docs/architecture/backup-encryption-design.md`. Not yet FINAL —
  requires the dedicated security review both documents name, and the KDF
  parameters specifically require empirical validation against a real
  minimum-device baseline.
- ~~Final key-management model~~ — **resolved to [PROPOSED]**: the hybrid
  approach this tracker previously proposed is now concrete — a two-tier
  DEK/KEK hierarchy, independent of the local database's own at-rest
  encryption key. See `backup-encryption-design.md` §4.
- **[PRODUCT OWNER DECISION REQUIRED]** Backup version-compatibility policy
  (how many prior schema versions remain restorable before a backup is
  rejected as too old) — analyzed in
  `/docs/architecture/migration-strategy.md` §"Backup compatibility," which
  proposes a default but does not finalize it.
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
  ~~**[Design gap tracked, not yet closed]**: the delivered
  `restore_existing_data_warning/` screen does not yet show the mandatory
  pre-replace safety-backup step as its own distinct step~~ — **resolved,
  FINAL UI correction pass before Phase 4** (`/docs/changelog.md`, entry
  "FINAL UI correction pass before Phase 4"). The flow now has ten distinct
  screen states (design-system.md §8.22): Existing Data Detected → Safety
  Backup Required → Creating Safety Backup → Safety Backup Success/Failure
  → Restore & Replace Confirmation (the repurposed
  `restore_existing_data_warning`) → Restore Progress → Restore
  Success/Failure → Cancellation. Only the technical staging/atomic-swap
  implementation mechanics remain open, not the design or the policy.
- ~~Whether the local database itself should be encrypted at rest~~ —
  **resolved at the policy level**: at-rest encryption of sensitive local
  business data is a **[CONFIRMED REQUIRED]** security requirement. ~~The
  mechanism~~ is now also **resolved to [PROPOSED]**: SQLCipher / AES-256,
  key generated on first launch and held exclusively in platform secure
  storage (Keychain/Keystore), never in the database file itself. See
  `ADR-005-local-database-encryption.md`. Not yet FINAL — requires the
  same dedicated security review named above. Key rotation is explicitly
  out of scope for this pass, not designed.
- **[NEW, Phase 4]** Root/jailbreak detection tooling, app-tamper-
  resistance tooling, notification lock-screen content visibility, and
  insecure-temporary-file handling during restore staging — all flagged
  as [OPEN-ARCH] in `/docs/security/threat-model.md`'s Phase 4 additions,
  none blocking the rest of the architecture, none decided here.

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

- **[PRODUCT OWNER DECISION REQUIRED, or data-driven tuning at
  implementation time]** Exact scoring formula and weight values
  (IMPORTANT vs. PREFERRED, partial-match tapering) — the *constraints*
  any eventual values must satisfy are now fixed
  (`/docs/matching/matching-architecture.md` §"Scoring-weight decision
  status"), but the numbers themselves are not, and are deliberately not
  defaulted to placeholder values in this pass.
- Approximate-value tolerance definition.
- Score normalization/presentation scale.
- Whether/how an optional natural-language input layer is eventually built
  (out of core-engine scope regardless of the answer). **Note**: this is no
  longer a prerequisite for supporting conditional requirements like "if
  pool, ignore bedrooms/area/price" — that's now supported by structured
  conditional criteria (`matching-architecture.md` §"Conditional /
  free-text-derived requirements"), independent of whether NL input is
  ever built.

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
- **[PRODUCT OWNER DECISION REQUIRED]** Referral code single-use vs.
  reusable (Phase 1 §5.1/§19.2/§19.6) — restated in
  `ADR-009-authentication-boundary.md` as still open; whatever is decided
  must be enforced server-side.
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
