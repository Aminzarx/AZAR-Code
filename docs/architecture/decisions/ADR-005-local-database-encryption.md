# ADR-005 — Local Database Encryption at Rest

> **Scope narrowed by `ADR-012-simplified-security-posture.md`
> (approved).** The core mechanism below — SQLCipher/AES-256, key
> generated at first launch, held in platform secure storage — is
> **unchanged and implemented** (`src/infrastructure/database/connection.ts`,
> `src/infrastructure/security/`). Dropped: the native-binding key-
> zeroization requirement and the dedicated implementation-level
> security-review gate. See ADR-012 for the current scope.

Status: **PROPOSED** — a concrete design, not yet run through a dedicated
security review.
Date: 2026-08-08

## Context

`/docs/security/threat-model.md` already establishes at-rest encryption of
the local database as **[CONFIRMED REQUIRED]**, not optional — under the
local-first model, the local database is the only copy of a user's
business data that exists anywhere, so a stolen device with forensic-level
extraction access to its storage must not yield readable business data.
What remained open was the mechanism: algorithm and key management. This
ADR closes that gap with a concrete, standard proposal.

## Decision

- **Encryption mechanism**: SQLite encrypted via **SQLCipher** (or the
  platform-appropriate equivalent extension providing the same
  transparent, page-level AES encryption model), using **AES-256** in
  SQLCipher's standard CBC-with-HMAC page format. This was already the
  natural pairing `ADR-002-local-database-source-of-truth.md` flagged
  given the SQLite proposal — this ADR confirms it as the actual mechanism
  rather than leaving it as a footnote.
- **What is encrypted**: the entire local database file — every table,
  including owner files, applicant files, requirement criteria, notes,
  contracts, matches and match explanations, reminders, notification
  history, and audit log entries. SQLCipher encrypts at the page level,
  so this is "the whole database" as a unit, not a per-column selection —
  simpler to reason about and impossible to accidentally leave a
  sensitive field unencrypted by omission.
- **What is not encrypted**: application settings that contain no business
  data or secrets (e.g. UI theme preference, once dark mode exists) may
  live in a separate, unencrypted local store (a key-value store, per
  `ADR-002`'s note on a complementary store for simple settings) — but
  anything referencing or derived from business data stays inside the
  encrypted database. The backup file's own encryption
  (`ADR-004-backup-encryption.md`) is a structurally separate, independent
  key from this one — see "Backup interaction" below.
- **Key generation**: a 256-bit key generated using the platform's secure
  random number generator at first app launch (or first database
  creation).
- **Key storage**: the key itself is stored **only** in the platform's
  secure hardware-backed storage — iOS Keychain (with the strongest
  available accessibility class that still permits background operation,
  e.g. equivalent to `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) or
  Android Keystore (hardware-backed where the device supports it). The key
  is never written to the database file itself, never stored in plain app
  storage, and never logged.
- **Key rotation**: **[OPEN — not designed in this pass]**. A rotation
  mechanism (re-encrypting the database under a new key) is not required
  for launch and is not designed here; noted as a future hardening item,
  not a gap in the current requirement.

## Alternatives considered

- **Platform-level full-disk/file encryption alone** (relying on iOS Data
  Protection or Android's file-based encryption at the OS level, without
  app-level database encryption) — rejected as insufficient on its own:
  OS-level disk encryption protects data primarily against a powered-off
  device being physically extracted, but many platform default
  accessibility classes decrypt file contents once the device is unlocked
  at least once after boot, which does not fully address the
  stolen-and-unlocked or forensic-extraction-after-unlock scenarios named
  in `threat-model.md`. App-level SQLCipher encryption adds a layer that
  depends on the app's own key handling, independent of the OS's disk-level
  guarantees.
- **A bespoke encrypted-field approach** (encrypt only specific "sensitive"
  columns in application code) — rejected: harder to audit for
  completeness (easy to miss a field), and reinvents what SQLCipher already
  does correctly and transparently at the page level. Directly contradicts
  the "do not invent cryptography" instruction more than a well-established
  extension does.
- **No at-rest encryption, relying only on app sandboxing** — already
  rejected at the threat-model level; sandboxing does not protect against
  physical/forensic-level device compromise, which is exactly the scenario
  this requirement exists for.

## Rationale

SQLCipher is a mature, widely audited, widely deployed SQLite extension
with production track records specifically in mobile apps handling
sensitive local data, and it plugs directly into the SQLite technology
choice already made in `ADR-002` without requiring a different database
engine or a bespoke storage layer. Storing the key exclusively in
platform secure hardware storage (never in the database, never in plain
files) follows the same pattern already established for session
credentials and backup key material (`threat-model.md`, "Secure key
storage").

## Consequences

- Every database access path in the application goes through SQLCipher's
  encrypted connection — there is no "fast unencrypted path" for any
  query, by construction, so there is no risk of a code path accidentally
  bypassing encryption.
- App startup must retrieve the key from secure storage before the
  database can be opened at all; if the key cannot be retrieved (e.g.
  secure storage is unavailable or was cleared), the app cannot open its
  own database — this is a fail-closed posture, and its user-facing
  handling (a real but hopefully rare failure mode) needs UX design in a
  later pass, not designed here.
- **Device migration**: because the encryption key lives in
  platform-specific secure storage tied to that install, it does not
  transfer with a simple app reinstall or a move to a new device — this is
  expected and correct (the key is not meant to be portable; the
  password-protected backup format is the portable path,
  `ADR-004-backup-encryption.md`). A user moving to a new device restores
  from a backup; they do not "carry over" the local database's encryption
  key.
- **App reinstall behavior**: reinstalling the app on the same device
  typically does not guarantee the platform secure-storage entry survives
  (this varies by platform and by whether the user also cleared app data)
  — if the key is lost, the previously-encrypted database file, if it
  still exists on disk, becomes permanently unreadable. This is the same
  category of risk `local-data-architecture.md` already names as the
  central risk of the local-first model ("no safety net without a
  backup") and reinforces, rather than changes, the product's existing
  emphasis on encouraging regular backups.
- **Backup interaction**: creating a backup means decrypting the live
  database (using this key, in memory only) and re-encrypting the
  extracted snapshot under the backup's own independent DEK/KEK
  (`ADR-004`) — the two encryption layers are never the same key, so a
  backup remains restorable on a device that has no knowledge of the
  original device's local-database key.

## Security implications

Closes the [DEFERRED] mechanism gap in `threat-model.md`'s "Local data
protection" section for the at-rest encryption requirement. Does not
change the compromise assumptions already documented there — an attacker
with the decryption key (e.g. an unlocked, actively-used device) still has
the same access a legitimate user would; encryption at rest specifically
defends against extraction of the raw file without the key, not against a
fully compromised, unlocked running app.

## Performance implications

SQLCipher's page-level AES-256 encryption/decryption adds CPU overhead to
every database read/write relative to plain SQLite — typically a modest,
well-characterized overhead in published benchmarks, but this product's
own overhead must be measured against the performance expectations in
`04-final-architecture.md` §Performance once a real schema and dataset
exist, not assumed.

## Phase 4B security review additions

Three requirements added as a direct result of the dedicated security
review (full detail in `/docs/security/phase-4-security-review.md`; the
backup-side equivalents of these same findings are in
`backup-encryption-design.md` §11):

- **[CONFIRMED, new requirement]** Any staged or temporary copy of the
  database — created during a schema migration or while validating a
  restore before the atomic swap — must itself be created as an encrypted
  SQLCipher database, never as a plaintext scratch file, even
  transiently. A crash or forensic disk capture during a staging window
  must never expose an unencrypted copy of business data.
- **[CONFIRMED, new requirement]** Key material (the database encryption
  key, in plaintext form, however briefly it's held during app startup or
  a key-rotation event if one is ever built) must be handled through a
  native crypto binding capable of explicit memory zeroing, not a
  pure-JavaScript code path — React Native's JS runtime has no
  deterministic memory-erasure guarantee, so a "discarded" key in JS may
  remain resident in the heap for an unpredictable window.
- **[CONFIRMED, new requirement]** The app's staging/cache directories
  must be explicitly excluded from OS-level device backup (iOS's
  `NSURLIsExcludedFromBackupKey`, Android's backup exclusion rules) — the
  encrypted live database itself being included in an OS-level backup is
  not a new risk (its key doesn't travel with it), but this closes the
  path for any staging file to leak through an OS backup mechanism.

## Status

**PROPOSED.** Requires a dedicated security review before FINAL, consistent
with the standing instruction not to finalize cryptographic algorithms
without one. Key-rotation design is explicitly out of scope for this pass.
The Phase 4B review (above) strengthened this ADR's requirements but did
not move it to FINAL — SQLCipher/AES-256 remains the right mechanism, and
the review found no reason to reconsider it, but a dedicated review
specifically of the *implementation* (once written) is still required
before this can be marked FINAL, consistent with the standing instruction.
