# Backup Encryption Design

Status: **PROPOSED — the dedicated security design step referenced by
`/docs/backup/backup-architecture-analysis.md` and
`/docs/architecture/unresolved-decisions.md`.** This document makes concrete
cryptographic choices, each backed by a well-established, audited primitive
or library — it does not invent anything. It is still marked PROPOSED
rather than FINAL because a decision this security-critical should get a
dedicated security review before it's locked in for implementation, per the
project owner's standing instruction not to finalize cryptography without
that review. Nothing here has been implemented; no library has been
installed.
Date: 2026-08-08

This document exists because `/docs/backup/backup-architecture-analysis.md`
deliberately analyzed the *shape* of the problem without picking specific
algorithms or parameters. That analysis is not repeated here — this
document picks up exactly where it left off and makes the choices it left
open.

## 1. Threat model (backup-specific)

Restated narrowly from `/docs/security/threat-model.md`, because the
backup file's threat profile is genuinely different from the live,
on-device database's:

- **The backup file is portable by design.** The user can copy it to
  another device, cloud storage, a USB drive, email — anywhere. Once it
  leaves the device, none of the app's own protections (sandboxing, device
  lock screen, at-rest DB encryption) apply to it anymore. The file's own
  encryption is the *only* thing standing between an attacker who obtains a
  copy and the business data inside it.
- **Password guessing against a stolen backup is unrateLimitable.** Unlike
  an OTP or login attempt, which the backend can throttle, an attacker
  with a copy of the file guesses passwords entirely offline, on hardware
  they control, at whatever speed that hardware allows. This is the single
  fact that drives the KDF choice below — a fast KDF turns "the backup is
  password-protected" into a false sense of security.
- **A backup file can be corrupted or maliciously modified** in transit or
  storage before it's ever imported back into the app. The app must be
  able to tell "this file was tampered with or damaged" apart from "this
  file is fine but the password is wrong" — conflating the two either
  leaks information to an attacker (a tampered file that "looks like" a
  wrong-password error confirms the format guess) or confuses a legitimate
  user trying to recover their own data.
- **A backup can be old.** The app may be asked to restore a file created
  by an earlier, differently-shaped version of itself. The format must
  make that detectable before any content is trusted, not discovered
  midway through applying it.

## 2. Encryption architecture — decision

**[PROPOSED — FINAL pending dedicated security review]**

| Layer | Choice | Why |
|---|---|---|
| Authenticated encryption (AEAD) | **AES-256-GCM** | The most widely audited, hardware-accelerated (AES-NI on most modern devices, ARMv8 Cryptography Extensions on mobile) AEAD cipher available in every major mobile crypto library (platform CryptoKit/Keystore-backed providers, libsodium, Web Crypto where relevant). Gives confidentiality and integrity together in one primitive, satisfying the authenticated-encryption requirement `backup-architecture-analysis.md` already established as non-negotiable. ChaCha20-Poly1305 remains a reasonable alternative on hardware without AES acceleration and is noted as a documented fallback, not a second primitive to support day one — supporting two AEAD ciphers doubles the validation/testing surface for no benefit at this product's scale. |
| Key-derivation function (KDF) | **Argon2id**, memory-hard, tuned per §3 | Directly answers the "unrateLimitable offline guessing" threat above. Argon2id is the winner of the Password Hashing Competition, is specifically designed to resist both GPU/ASIC brute-forcing (via memory-hardness) and side-channel/timing attacks (the "id" variant hybridizes Argon2i's side-channel resistance with Argon2d's GPU resistance) — this is exactly the profile `threat-model.md` already named it for. |
| Key hierarchy | **Two-tier: a per-backup random Data Encryption Key (DEK), wrapped by a Key-Encryption Key (KEK) derived from the user's backup password via Argon2id** | See §4. This is the standard "envelope encryption" pattern — it means the expensive Argon2id derivation only has to run once per backup operation (to unwrap/wrap the DEK), not once per block of data, and it means changing the backup password later (a possible future feature) would only require re-wrapping the DEK, not re-encrypting the entire payload. |
| Salt | **32 random bytes, generated fresh per backup, stored unencrypted in the header** | A salt does not need to be secret — its job is to make every backup's KDF input unique so precomputed (rainbow-table-style) attacks are useless, and so two backups made with the same password never derive the same key. Storing it in the (unencrypted) header is standard practice and does not weaken the scheme. |
| Nonce/IV | **12-byte (96-bit) random nonce, generated fresh per encryption operation, stored unencrypted in the header — never reused with the same key** | GCM's security guarantee depends entirely on nonce uniqueness per key. Because each backup uses a freshly-generated random DEK (§4), nonce reuse across *different* backups is a non-issue by construction; the only requirement is never reusing a nonce within the same encryption operation, which a single-shot "encrypt the whole payload once" design (§5) satisfies trivially — there is no streaming/multi-chunk nonce-counter scheme to get wrong here. |
| Authentication/integrity | **GCM's built-in authentication tag (128-bit), verified before any payload byte is trusted** | Already implied by choosing an AEAD cipher; called out explicitly because the restore-validation ordering (§6) depends on checking this tag *before* attempting to interpret decrypted bytes as business data. |

## 3. KDF parameters

**[PROPOSED — FINAL pending dedicated security review, and pending
empirical tuning on real target devices]**

Starting parameters, chosen to sit within OWASP's current Argon2id
guidance for interactive, user-facing password verification while staying
mindful that this runs on a mobile device, not a server:

| Parameter | Value | Rationale |
|---|---|---|
| Memory cost | 64 MiB | Meaningful memory-hardness against GPU/ASIC attackers without risking out-of-memory failures on low-end supported devices. |
| Iterations (time cost) | 3 | Paired with the memory cost above, targets roughly half a second to low-single-digit seconds of derivation time on a mid-range mobile CPU — slow enough to matter for an offline attacker trying millions of guesses, fast enough that a legitimate user entering their backup password once does not perceive it as broken. |
| Parallelism | 1 | Mobile CPUs have far fewer cores available to a background operation than a desktop/server attacker's cracking rig would use in parallel across many candidate passwords simultaneously; a parallelism of 1 keeps the legitimate-user cost predictable and avoids the derivation itself competing for cores with the rest of the app. |
| Output key length | 32 bytes (256 bits) | Matches the AES-256 key size the KEK is used for. |

**This document does not claim these numbers are final without device
testing.** They are a defensible, standards-aligned starting point (OWASP's
Argon2id recommendations), not a guess pulled from nowhere — but the actual
derivation time on the lowest-spec device this product commits to
supporting (a decision that depends on ADR-001's eventual platform choice
and the product's minimum-OS-version target, both still open) must be
measured before these numbers are locked in for implementation. **[OPEN —
requires empirical validation once a target device baseline exists.]**

## 4. Key hierarchy

```
User's backup password
        │
        ▼ Argon2id(password, salt, params above)
   Key-Encryption Key (KEK) — 256-bit, held only in memory,
   never persisted anywhere, discarded immediately after use
        │
        ▼ unwraps / wraps (AES-256-GCM, itself authenticated)
   Data Encryption Key (DEK) — 256-bit, randomly generated fresh
   for every backup created, stored only in its wrapped (KEK-encrypted)
   form inside the backup file's header
        │
        ▼ encrypts (AES-256-GCM)
   Backup payload (the business-data snapshot)
```

- **Why a DEK/KEK split instead of encrypting the payload directly with the
  password-derived key?** Two reasons, both concrete: (1) it means a future
  "change my backup password" feature only has to re-wrap a small key, not
  re-encrypt a potentially large payload; (2) it keeps the
  password-derivation step's cost isolated to key-unwrapping (a small,
  fixed-size operation) rather than needing to re-run Argon2id conceptually
  "over" the whole payload.
- **The password itself is never stored, anywhere, in any form** — not
  hashed, not encrypted. It exists only transiently in memory during
  backup creation or restore, long enough to derive the KEK, and is then
  discarded. A forgotten backup password is, by design, unrecoverable —
  this is stated plainly, not softened, because a "recovery" mechanism for
  a password-derived key would mean the encryption doesn't actually depend
  on the password, which would defeat the entire point.
- **This key hierarchy is independent of the local database's at-rest
  encryption key** (`ADR-005-local-database-encryption.md`). A backup must
  remain restorable on a different device than the one that created it, so
  its confidentiality cannot depend on anything tied to the originating
  device's secure storage — this is the same reasoning
  `backup-architecture-analysis.md` used to recommend the hybrid
  key-management model, now made concrete.

## 5. Backup file format

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (unencrypted, but integrity-protected as part of AAD) │
│  - magic bytes (format identifier)                            │
│  - format version (uint)                                      │
│  - schema version the payload was created against (uint)      │
│  - creation timestamp                                         │
│  - KDF identifier + parameters (memory cost, iterations,       │
│    parallelism) — so a future parameter change doesn't break  │
│    old backups; each backup carries the parameters it was     │
│    actually made with                                         │
│  - salt (32 bytes)                                             │
│  - wrapped DEK (the DEK, encrypted with the KEK, plus its own  │
│    GCM auth tag and nonce)                                     │
│  - payload nonce (12 bytes)                                    │
├─────────────────────────────────────────────────────────────┤
│ ENCRYPTED PAYLOAD (AES-256-GCM, key = DEK)                     │
│  - the business-data snapshot (per                             │
│    local-data-architecture.md's "safely snapshot the current  │
│    local database state" approach)                             │
│  - GCM authentication tag (128 bits) covering the payload      │
└─────────────────────────────────────────────────────────────┘
```

- **The header is authenticated but not secret.** Every header field above
  is passed as Additional Authenticated Data (AAD) to both the DEK-wrapping
  and payload-encryption GCM operations, so tampering with *any* header
  field (e.g. rolling back the format version to try to exploit an older,
  less-validated parser) is detected by the authentication tag failing,
  even though the header itself is readable without a password. This
  directly satisfies "detect tampering before trusting any content"
  (`backup-architecture-analysis.md`, "Integrity/authentication").
- **The KDF parameters travel with the backup**, not with the app. This
  means tuning §3's numbers upward in a future app version never breaks
  the ability to restore an older backup — the app reads the parameters
  the file was actually made with and derives accordingly.
- **A single self-contained file**, per the portability requirement already
  established — no companion files, no sidecar metadata the user could
  separate from the main file by accident.

## 6. Restore validation order

**[CONFIRMED — this ordering is a hard requirement, not a stylistic
preference]**, extending `backup-architecture-analysis.md`'s ordering with
the concrete mechanics now available:

1. **Format recognition.** Check the magic bytes and that the file is at
   minimum long enough to contain a well-formed header. Reject
   immediately, with a "this doesn't look like a backup file" error, if
   not — no decryption is attempted yet.
2. **Header parse + format-version check.** Parse the (unencrypted) header
   fields. If the format version is one this app version does not know how
   to handle, reject with a version-specific error before touching
   anything cryptographic.
3. **DEK-unwrap authentication check.** Derive the KEK from the
   user-supplied password and the header's salt/KDF parameters, then
   attempt to unwrap the DEK. GCM's authentication tag on the wrapped DEK
   will fail here if either the password is wrong *or* the header was
   tampered with — at this stage the two cannot yet be distinguished from
   each other, which is fine, because:
4. **Payload authentication check.** Attempt to decrypt the payload with
   the unwrapped DEK. If step 3 already failed, this step is never
   reached — the user sees "incorrect password" (RST-02), which is the
   more actionable and more common real-world case, rather than a generic
   tamper warning. If step 3 succeeded but this step's authentication tag
   fails, that specifically indicates payload-level corruption or tampering
   independent of the password being correct — surfaced as a distinct
   "this backup file is corrupted" error (RST-03), matching the two
   visually and semantically distinct screens already designed
   (`restore_password_entry` vs. `restore_corrupted_backup` in the Stitch
   package).
5. **Schema-version compatibility check.** Only after the payload is
   confirmed authentic and decrypted does the app inspect the schema
   version the payload claims to have been created against, and decide
   whether it can migrate it forward, or must reject it as
   incompatible (RST-04) — detailed in `migration-strategy.md`.
6. **Structural/content validation.** Parse the decrypted payload into
   the expected internal structure and validate it is well-formed business
   data (correct table/record shapes, required fields present) before
   treating any of it as trusted input to the restore-write step. This is
   the implementation-phase parser-hardening step `threat-model.md`
   already flagged under "Export/import risks" — no deserialization path
   that could execute arbitrary code or write outside the expected data
   model is acceptable here.
7. **Only after all six steps above succeed** does the restore proceed to
   the safety-backup-then-replace sequence defined in
   `/docs/01-product-requirements.md` §14 and enforced structurally by
   `04-final-architecture.md`'s restore state machine. No step above ever
   touches the live, existing local database — everything up to this point
   operates only on the incoming file and in-memory/staged data.

This ordering guarantees the most specific, most actionable error is always
the one shown (matching `backup-architecture-analysis.md`'s stated goal),
and guarantees that nothing derived from an unauthenticated or
unrecognized file is ever trusted, decrypted-and-parsed-as-data, or written
to the live database.

## 7. Password handling

- The backup password is collected via a standard secure text input (no
  custom keyboard, no logging of keystrokes).
- It is held in memory only for the duration of the derive-and-
  unwrap/wrap operation and is not retained afterward — no "remember this
  password" feature is in scope; each restore or password-protected backup
  operation requires re-entry.
- It is never written to disk, never included in any log line (per the
  existing, standing "never log secrets" rule in `threat-model.md`), and
  never transmitted anywhere — this is a fully local, offline operation
  by design (backup creation and restore are both OFFLINE per
  `/docs/01-product-requirements.md` §4a).
- **A forgotten backup password cannot be recovered by the app, its
  developers, or anyone else.** This must be communicated to the user
  plainly at the point of setting the password (a UX/copy concern, per
  `/docs/ui/content-style-guide.md`'s rules on honest, specific messaging)
  — not softened into something that sounds recoverable when it isn't.

## 8. Versioning and migration interaction

- The header's `format version` and `schema version` are two distinct
  numbers on purpose: `format version` describes the *container*
  (header layout, crypto scheme) and should change rarely; `schema
  version` describes the *business-data shape inside the payload* and
  changes whenever the app's data model evolves. Conflating them would
  force a full format migration every time a table gains a column.
- Full migration policy (what happens when a backup's schema version is
  older or newer than what the current app supports) is specified in
  `/docs/architecture/migration-strategy.md`, not repeated here — this
  document only guarantees the container makes that version information
  available before any content is trusted, which is the precondition
  migration policy depends on.

## 9. Failure handling

Every failure mode below must leave the existing live local database
completely untouched — this document adds no exception to that invariant,
which is enforced at the restore state-machine level
(`04-final-architecture.md` §Restore Safety):

| Failure | Detected at step (§6) | User-facing distinction |
|---|---|---|
| Not a backup file at all | 1 | "This file doesn't look like a backup." |
| Unrecognized/future format version | 2 | "This backup was created by a newer app version." |
| Wrong password | 3 | "Incorrect password" (RST-02) |
| Corrupted or tampered payload | 4 | "This backup file is corrupted" (RST-03) |
| Incompatible schema version (too old to migrate, or too new) | 5 | Version-specific message (RST-04), see `migration-strategy.md` |
| Malformed content after successful decryption | 6 | Treated the same as corruption (RST-03) from the user's perspective — the file decrypted but isn't valid business data, which is functionally indistinguishable from corruption to a user, even though the app can tell it apart from a wrong-password/tamper case internally |

## 10. What this document does not decide

Per the explicit instruction not to finalize implementation mechanics
casually:

- **[OPEN-ARCH]** The exact cryptographic library/SDK per platform (e.g.
  platform-native CryptoKit/Keystore-backed AEAD vs. a cross-platform
  library such as libsodium) — this depends on ADR-001's eventual platform
  choice and should use whichever option has the most mature, audited
  binding for the chosen platform, not a bespoke implementation of AES-GCM
  or Argon2id from primitives.
- **[OPEN — requires empirical validation]** Final KDF parameter tuning
  against the actual minimum-supported device baseline (§3).
- **[OPEN-ARCH, UX-dependent]** Whether backup password entry ever offers
  a "copy to clipboard" or "reveal password" convenience — already flagged
  as a risk in `threat-model.md`'s "Clipboard risks" section, not resolved
  here.
- A "change backup password" feature is structurally supported by the
  DEK/KEK split (§4) but is not itself an existing product requirement —
  noted only so a future decision to add it doesn't require revisiting
  this document's key hierarchy.
