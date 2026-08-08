# ADR-004 — Backup Encryption Scheme

Status: **PROPOSED** — a concrete, standards-based design, not yet run
through a dedicated security review. See
`/docs/architecture/backup-encryption-design.md` for the full analysis;
this ADR records the decision in the standard ADR shape.
Date: 2026-08-08

## Context

`/docs/backup/backup-architecture-analysis.md` deliberately analyzed the
backup format's requirements without selecting an algorithm or KDF,
per instruction. Phase 4 is the dedicated design step that document
pointed to. A backup file is portable by design — once it leaves the
device, the app's own protections no longer apply, and an attacker with a
copy can attempt password guesses completely offline with no rate limit
the app can enforce.

## Decision

- **AEAD cipher**: AES-256-GCM for both payload encryption and DEK
  wrapping.
- **KDF**: Argon2id, 64 MiB memory cost, 3 iterations, parallelism 1,
  32-byte output — see `backup-encryption-design.md` §3 for rationale and
  the explicit note that these numbers need empirical validation against
  a real minimum-device baseline before being locked in.
- **Key hierarchy**: two-tier DEK/KEK (random per-backup DEK, wrapped by a
  password-derived KEK) — see `backup-encryption-design.md` §4.
- **Salt**: 32 random bytes per backup. **Nonce**: 12 random bytes per
  encryption operation, never reused with the same key.
- **Format**: unencrypted-but-authenticated header (carries format
  version, schema version, KDF parameters, salt, wrapped DEK, payload
  nonce) + encrypted payload, single self-contained file.
- **Validation order**: format recognition → header/version check →
  DEK-unwrap auth check → payload auth check → schema-version
  compatibility → structural validation — in that order, before any
  content is trusted (`backup-encryption-design.md` §6).

## Alternatives considered

- **ChaCha20-Poly1305** instead of AES-256-GCM — a reasonable alternative
  on hardware without AES acceleration; not selected as the primary choice
  because AES-GCM has broader mobile hardware acceleration and equally
  mature library support, and supporting two AEAD ciphers from day one
  adds validation surface without a concrete benefit at this product's
  scale. Documented as a fallback option, not rejected outright.
- **PBKDF2 or scrypt** instead of Argon2id — both are viable password-based
  KDFs, but Argon2id's memory-hardness and side-channel-resistant "id"
  mode make it the stronger choice specifically against the offline,
  attacker-controlled-hardware brute-force scenario this backup format is
  exposed to; PBKDF2 in particular is comparatively cheap to accelerate on
  GPUs.
- **Single-tier encryption** (password-derived key encrypts the payload
  directly, no DEK) — simpler, but ties the expensive KDF operation to the
  full payload size and forecloses a future "change backup password"
  feature without full re-encryption. Rejected in favor of the DEK/KEK
  split.
- **Device-only key (no user password)** — analyzed and rejected in
  `backup-architecture-analysis.md` already: undermines the "restore on
  another device" requirement. Not re-litigated here.

## Rationale

Every primitive chosen is a well-established, widely audited standard
(AES-GCM, Argon2id) available through mature libraries on both candidate
mobile platforms — consistent with the product's explicit instruction to
never invent cryptography. The two-tier key hierarchy and validation
ordering directly answer the specific threats named in
`backup-encryption-design.md` §1: offline brute-forcing, tampering, and
version confusion.

## Consequences

- Implementation must use a mature, audited library binding for AES-GCM
  and Argon2id on the eventual platform (ADR-001) rather than a bespoke
  implementation of either primitive.
- KDF parameters travel with each backup file, so tuning them upward in a
  future app version never breaks restoring an older backup.
- A forgotten backup password is unrecoverable by design — this has to be
  communicated honestly to the user (per `/docs/ui/content-style-guide.md`),
  not softened.

## Security implications

Directly addresses the "brute-force backup password" and "tampered/
malicious backup" threats in `/docs/security/threat-model.md`. Does not by
itself address key-storage risks on the *device* side — that's
`ADR-005-local-database-encryption.md`, a structurally independent
decision, deliberately: a backup's confidentiality must not depend on the
originating device's secure storage.

## Performance implications

Argon2id's cost (~0.5-a few seconds on a mid-range device, per the tuning
in §3 of the design doc) is a one-time cost per backup-create or restore
operation, not a per-record or per-query cost — acceptable for an
infrequent, explicit user action, but must be measured on real target
hardware before the parameters are locked in.

## Status

**PROPOSED.** Requires a dedicated security review (per standing
instruction) before this leaves PROPOSED status, and requires empirical
KDF-parameter validation against a real minimum-device baseline, which in
turn depends on ADR-001 (platform) and a minimum-OS-version decision, both
still open.
