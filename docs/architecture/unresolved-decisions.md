# Unresolved Architectural Decisions (Consolidated Tracker)

Status: DRAFT — consolidates every open item flagged across the full
document set into one place, so nothing gets lost between documents.
Update this file whenever an item below is resolved elsewhere.
Date: 2026-08-08 (revised again in the pre-Phase-5 pass — minimum Android
version and Xiaomi compatibility are now FINAL, ADR-010; previously
revised in the Phase 4B product-decisions + security-gate pass — platform,
backup version-compatibility window, and referral reuse policy are now
FINAL; the dedicated cryptographic security review required before
ADR-004/ADR-005 could be considered has been performed
(`/docs/security/phase-4-security-review.md`), strengthening both designs
without changing their core algorithm choices; both remain PROPOSED,
pending an implementation-level review, not a design-level one)

## Platform

- ~~React Native vs. Capacitor~~ (ADR-001) — **resolved, FINAL**: React
  Native. Confirmed by the project owner in the Phase 4B pass; no
  previously undocumented blocker was found against the full requirement
  list. Capacitor is no longer under consideration.
- ~~Minimum supported Android version~~ (ADR-010) — **resolved, FINAL**:
  Android 8.0 / API 26, latest stable SDK as target/compile SDK. No
  silent increase permitted; every dependency is checked for API 26
  compatibility before adoption, and an incompatible dependency is
  replaced, not accommodated by raising the floor.
- ~~Xiaomi device compatibility~~ (ADR-010) — **resolved, FINAL**: Xiaomi
  (MIUI/HyperOS) is a first-class, non-negotiable supported platform, not
  a best-effort target. A full compatibility test matrix and an explicit
  release-blocking stability requirement are recorded in
  `/docs/implementation/testing-strategy.md`.
- **[OPEN, not addressed by ADR-010]** Minimum supported iOS version —
  ADR-010 resolved the Android side of this question specifically; iOS's
  minimum version remains a separate, still-open product-owner decision.

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
  [PROPOSED], dedicated security review complete**: AES-256-GCM (AEAD,
  algorithm choice now **FINAL**) + Argon2id (KDF, algorithm choice
  **FINAL**; parameters — 64 MiB / 3 iterations / parallelism 1 — remain
  **PROPOSED** pending the benchmarking procedure now defined in
  `backup-encryption-design.md` §3.1). See `ADR-004-backup-encryption.md`
  and `/docs/security/phase-4-security-review.md` §7 for the full status
  table.
- ~~Final key-management model~~ — **resolved, FINAL, revised by
  `ADR-012-simplified-security-posture.md` (approved)**: single-tier —
  a password-derived Argon2id key encrypts the backup payload directly
  with AES-256-GCM. The two-tier DEK/KEK hierarchy analyzed here and
  confirmed by the Phase 4B review is superseded, not in effect.
  Implemented: `src/infrastructure/backup/backupFile.ts`.
- ~~Backup version-compatibility policy~~ — **resolved, FINAL**: CURRENT +
  2 previous backup format generations. See
  `/docs/architecture/migration-strategy.md` §"Backup compatibility."
- ~~Encrypted staging for restore/migration temp files, native-binding
  key zeroization, and OS-backup exclusion for staging paths~~ —
  **dropped by `ADR-012-simplified-security-posture.md` (approved)**.
  No longer required. Staging still uses a temp file (restore cannot
  safely operate on the live database directly) but is not held to the
  Phase 4B hardening bar.
- ~~Minimum supported OS version / device tier~~ — **resolved, FINAL**:
  Android 8.0 / API 26 minimum, latest stable SDK as target/compile SDK,
  Xiaomi devices first-class and non-negotiable. See
  `ADR-010-minimum-android-version-and-xiaomi-compatibility.md`. The
  Argon2id benchmarking procedure (`backup-encryption-design.md` §3.1)
  can now be executed against a concrete device target (a Xiaomi
  low/mid-range device at or near API 26) — only the benchmark run itself
  remains outstanding, not a further product decision. iOS's own minimum
  supported version was not addressed by this decision and remains
  **[OPEN — product owner decision still required for iOS specifically]**.
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
  **resolved, FINAL**: at-rest encryption of sensitive local business
  data is a **[CONFIRMED REQUIRED]** security requirement. ~~The
  mechanism~~ is also **resolved, implemented**: SQLCipher / AES-256, key
  generated on first launch and held exclusively in platform secure
  storage (Keychain/Keystore), never in the database file itself. See
  `ADR-005-local-database-encryption.md` and
  `ADR-012-simplified-security-posture.md` (which dropped the dedicated
  implementation-review gate this bullet previously pointed to — normal
  code review applies). Implemented:
  `src/infrastructure/database/connection.ts`,
  `src/infrastructure/security/`. Key rotation remains out of scope, not
  designed.
- **[NEW, Phase 4]** Root/jailbreak detection tooling, app-tamper-
  resistance tooling, and notification lock-screen content visibility
  remain **[OPEN-ARCH]** in `/docs/security/threat-model.md`'s Phase 4
  additions, none blocking the rest of the architecture. ~~Insecure-
  temporary-file handling during restore staging~~ — **resolved, FINAL
  requirement** in the Phase 4B security review (encrypted staging,
  §11.3 of `backup-encryption-design.md`).

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
  (IMPORTANT vs. PREFERRED, partial-match tapering) — the full formal
  model (match types, missing/conflicting/excluded-value handling,
  normalization, explanation generation) is now specified in
  `/docs/architecture/matching-scoring-spec.md`; only the actual numbers
  remain open, deliberately not defaulted to placeholder values.
- Approximate-value tolerance definition and the tapering function's exact
  shape (`matching-scoring-spec.md` §"Match types").
- Score normalization presentation scale (0-100 vs. another scale —
  `matching-scoring-spec.md` §"Score normalization" fixes what the score
  *represents*, not how it's displayed).
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
- ~~Referral code single-use vs. reusable~~ (Phase 1 §5.1/§19.2/§19.6) —
  **resolved, FINAL**: a referral relationship is immutable once
  registration succeeds — no replace, remove, or re-attach path exists
  after that point. Self-referral is rejected. See
  `ADR-009-authentication-boundary.md` §"Referral reuse policy."
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
