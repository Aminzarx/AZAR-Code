# ADR-012 — Simplified Security Posture

Status: **PROPOSED** — a product-owner-directed revision of the project's
security scope, not yet implemented. Supersedes the specific mechanisms in
`ADR-004-backup-encryption.md` (two-tier DEK/KEK, the Phase 4B hardening
list) and narrows `ADR-005-local-database-encryption.md`'s implementation
scope. Does **not** supersede `ADR-002` (SQLite), `ADR-010` (API 26 /
Xiaomi), or any non-security ADR.
Date: 2026-08-08

## Context

The product owner has explicitly redirected the project's security scope:
AZAR is a professional real-estate file-management app for a single
agent, not a financial or enterprise system, and its security posture
should be sized to that — "proportionate protection," not "enterprise
security." The existing security documentation set
(`threat-model.md`, `backup-encryption-design.md`,
`phase-4-security-review.md`, `ADR-004`, `ADR-005`) was written to a
materially heavier standard: a two-tier DEK/KEK key hierarchy, an
adversarial multi-scenario threat model, native-binding key-zeroization
requirements, mandatory encrypted staging, OS-backup exclusion rules,
crash-remnant cleanup sweeps, and a dedicated implementation-level
security-review gate before anything could reach FINAL.

Per this project's own standing rule ("never silently change a FINAL
decision — a new ADR supersedes the old one with an explicit
project-owner decision behind it"), this ADR is that explicit record. It
does not weaken the two things the product owner named as still required
— proper protection of user data, and safe backups — it changes *how much
mechanism* delivers them.

## What stays (non-negotiable, restated from the redirect)

1. User data gets real protection — not "no encryption at all."
2. Backups are encrypted, not plaintext.
3. The app must not corrupt or lose data — safe, transactional migrations
   and a restore path that never destroys existing data before a backup
   of it exists.
4. Android API 26 minimum, Xiaomi/MIUI/HyperOS first-class compatibility
   (`ADR-010`, untouched by this ADR).

## What changes

### Local database encryption (revises `ADR-005`'s scope, not its core choice)

- **Mechanism, unchanged**: SQLCipher via `@op-engineering/op-sqlite`
  (already integrated in Phase 6, `ADR-011`) — AES-256, key generated at
  first launch, held in platform secure storage (Keystore/Keychain).
  This was never the source of the complexity; it is one function
  parameter (`encryptionKey`) on an already-chosen library.
- **Dropped**: the requirement for a *native-binding-specific* key-
  handling layer with explicit memory zeroization
  (`backup-encryption-design.md` §11.2). Standard platform secure-storage
  retrieval is sufficient — this was an enterprise-grade hardening detail
  against a memory-forensics threat class this product does not need to
  defend against.
- **Dropped**: a dedicated implementation-level security review as a
  release gate (Phase 15 in the original roadmap). Normal code review
  applies; a specialized crypto audit is not required for a single,
  well-established encryption library used as documented.

### Backup encryption (supersedes `ADR-004`'s key hierarchy)

- **Simplified to single-tier**: a backup password, run through a
  standard password-hashing KDF (Argon2id — kept because it is one
  function call in any mature crypto library, not meaningfully more
  complex than the alternatives, and already-referenced parameters exist
  to reuse), produces the key that encrypts the backup payload directly
  with AES-256-GCM. **No separate DEK/KEK split.**
- **What this gives up**: changing a backup's password without fully
  re-encrypting its payload (the DEK/KEK split's main practical benefit).
  Not a feature this product has committed to — acceptable to lose.
- **What is kept**: the backup is still authenticated (GCM's built-in tag)
  — a tampered or corrupted backup is still detected, not silently
  trusted. A wrong password still fails clearly. This is the actual
  security property that matters for "secure backup"; the two-tier key
  hierarchy was extra structure around it, not the protection itself.
- **Dropped**: mandatory encrypted staging for restore temp files
  (`backup-encryption-design.md` §11.3), OS-backup exclusion rules for
  staging paths (§11.4), and startup crash-remnant cleanup sweeps (§11.5).
  These defended against an attacker with forensic access to a device's
  temp storage during the brief window a restore is in progress — a real
  but low-probability, enterprise-threat-model-tier scenario for this
  product. Staging still uses a temp file (restore cannot safely operate
  directly on the live database), it is just not held to the same
  hardening bar.
- **Version-compatibility window**: **unchanged, still FINAL** — CURRENT +
  2 previous backup format generations (`migration-strategy.md`). This is
  a data-safety rule (never silently attempt an incompatible restore),
  not a security-complexity item, and stays exactly as it was.

### Threat model → replaced by a short, practical risk list

`docs/security/threat-model.md`'s adversarial framing (rooted-device
forensics, memory-extraction attacks, nation-state-tier scenarios) is
replaced by the risk list actually relevant to this product's real usage:

1. **Phone lost or stolen** → local data must not be readable without
   unlocking the device and the app being able to open its (encrypted)
   database — covered by SQLCipher + secure-storage key, above.
2. **Backup file shared, lost, or stored somewhere insecure** → must not
   be readable without the backup password — covered by AES-256-GCM +
   Argon2id, above.
3. **Forgotten backup password** → data in that backup is unrecoverable;
   communicated honestly to the user (`content-style-guide.md`), not
   softened. Unchanged from the original design.
4. **App crash or interruption during a write, migration, or restore** →
   must never leave the database in a half-written, corrupted state —
   covered by the existing transactional-migration and restore-safety-
   backup requirements (`migration-strategy.md`, `04-final-architecture.md`
   §7), **fully retained** — this is a data-integrity property, not a
   security-complexity one, and the redirect does not touch it.
5. **A device running old Android or Xiaomi's modified OS behaves
   unusually** → handled by `ADR-010`'s compatibility requirements,
   untouched.

No rooted-device detection, no anti-tampering, no memory-forensics
defense, no formal adversary-capability modeling. This product's
realistic risk is a lost phone or a mishandled backup file, not a
targeted attacker with device-forensics tooling — sizing the model to
that is the point of this ADR.

### What is retired outright

- `docs/security/phase-4-security-review.md` — the enterprise-tier crypto
  review. Superseded by this ADR; kept in the repo as historical record,
  not deleted, but no longer governs implementation.
- The DEK/KEK two-tier hierarchy described in
  `docs/architecture/backup-encryption-design.md` §4 — superseded by the
  single-tier design above. The rest of that document (format layout,
  validation ordering, version-compatibility handling) still applies
  where it doesn't depend on the two-tier split.
- The Phase 15 "independent implementation security audit" gate in
  `docs/implementation/implementation-roadmap.md` — replaced by normal
  code review. Phase 15 in a future roadmap revision should be re-scoped
  or removed; not done in this ADR (documentation consistency pass, not
  this decision's job).

## Rationale

Every mechanism dropped above defended against a threat class (memory
forensics, forensic device imaging mid-restore, a sophisticated attacker
targeting one specific user's backup file) that is disproportionate to a
single-agent real-estate CRM's actual risk profile, and each added real
implementation and review cost (a dedicated native key-zeroization layer,
a mandatory staging-encryption test suite, a full implementation security
audit gate) without changing the answer to the two questions that
actually matter for this product: *can someone read my data if they get
my phone or my backup file without my password or my device unlock?* —
still no, under this simplified design.

## Consequences

- Phase 7 (Security & Cryptography) implementation is smaller: SQLCipher
  wrapping (unchanged scope) + single-tier AES-256-GCM/Argon2id backup
  encryption (reduced scope) + the existing transactional/restore-safety
  work (unchanged, since that's data integrity, not security posture).
- `docs/implementation/implementation-roadmap.md`'s Phase 7 and Phase 15
  descriptions are now stale in places and should be updated in a
  documentation-consistency pass once this ADR is approved — flagged
  here, not done as a side effect of this decision.
- Nothing in Phase 5 or Phase 6 (already built) needs to change — neither
  phase touched encryption yet.

## Status

**PROPOSED.** Awaiting explicit product-owner confirmation before Phase 7
implementation proceeds under this reduced scope, per the same approval
pattern used for `ADR-011`.
