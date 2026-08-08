# Phase 7 Notes — Security & Cryptography (Simplified Scope)

Status: RECORD OF IMPLEMENTATION-PHASE FINDINGS, same spirit as
`phase-5-decisions.md`/`phase-6-notes.md`. Implements Phase 7 under the
scope `ADR-012-simplified-security-posture.md` (approved) defines.
Date: 2026-08-08

## What was built

- **Local database encryption**: SQLCipher enabled on op-sqlite
  (`"op-sqlite": {"sqlcipher": true}` in `package.json`). The database key
  is generated once (32 random bytes) on first use and held in platform
  secure storage (`src/infrastructure/security/databaseKey.ts` +
  `keychainSecureStorage.ts`, backed by `react-native-keychain`).
  `connection.ts` retrieves/creates the key and passes it to op-sqlite's
  `open()` — this is the exact "integration point" Phase 6 was built to
  leave open.
- **Backup encryption**: single-tier, per ADR-012 —
  `src/infrastructure/backup/backupFile.ts` derives an AES-256-GCM key
  directly from the backup password via Argon2id
  (`src/infrastructure/security/kdf.ts`) and encrypts the payload
  (`aead.ts`). Unencrypted header fields (format/schema version, KDF
  params, salt) are bound to the auth tag as AAD, so tampering with them
  is also detected — this is correct baseline GCM usage, not the
  enterprise hardening ADR-012 dropped.
- Validation order on restore matches `migration-strategy.md`'s
  checklist as far as this crypto-only module can enforce it: recognized
  format → well-formed header → authentication (which also confirms the
  password) — before any payload content is returned to a caller.
  Schema-version-compatibility-window checking (CURRENT+2) is exposed via
  the returned `schemaVersion` but enforced by the caller — that policy
  belongs to restore orchestration (a later phase), not this module.

## New dependencies and why

| Dependency | Role | Note |
|---|---|---|
| `react-native-quick-crypto` (+ peers `react-native-nitro-modules`, `react-native-quick-base64`) | AES-256-GCM + Argon2id + secure random bytes | Actively maintained (Margelo), Node-crypto-API-compatible by design, RN ≥0.75 (satisfied by 0.86.2). Chosen over `react-native-argon2` once discovered quick-crypto ships its own Argon2 implementation — one native crypto dependency instead of two. |
| `react-native-keychain` | iOS Keychain / Android Keystore wrapper | De facto standard for this in RN; v10.0.0. |
| `argon2` (devDependency only) | Real Argon2id computation for Jest tests | Node-native (N-API) binding, not shipped in the app. |
| `patch-package`, `better-sqlite3` | Already added in Phase 6 | Unchanged. |

`crypto-js` was evaluated and rejected first — it does not implement
AES-GCM at all (verified before adopting it), which would have been a
silent correctness gap discovered too late.

## Android/iOS static verification

Same method as Phase 6 (no Android SDK/Xcode in this environment — real
build not possible here):
- `react-native-quick-crypto`, `react-native-nitro-modules`,
  `react-native-keychain` all read `minSdkVersion` from the root
  project's `ext` block (26) — no conflicting floor.
- `react-native-quick-base64` has no standalone `build.gradle` (built via
  the Nitro Modules codegen pipeline alongside `react-native-nitro-modules`,
  which does read the project floor) — inheritance not independently
  confirmed; flagged for real-build verification.
- No non-standard Podfile requirement found for any of the four beyond
  standard `use_native_modules!` autolinking + `pod install`.

## Tooling findings (test-harness only)

1. **op-sqlite's Node binding does not support SQLCipher.** Its own
   source prints `"Encryption is not supported in the Node.js
   implementation. Use @journeyapps/sqlcipher for encryption support."`
   and opens a plain database regardless of the `encryptionKey` passed.
   This means Phase 6/7's `connection.test.ts` exercises the connection
   *logic* (singleton behavior, foreign-key pragma, key retrieval/
   generation) against a real SQLite engine, but **cannot verify actual
   SQLCipher encryption** — "opening without the correct key fails" is
   untested in this environment and must be verified on a real
   Android/iOS build.
2. **`react-native-quick-crypto` has no Node binding of its own**
   (unlike op-sqlite). Jest is configured (`jest.config.js`
   `moduleNameMapper`) to resolve it to
   `testutils/reactNativeQuickCryptoNodeShim.js`, which re-exports Node's
   real built-in `crypto` module for AES-256-GCM/random bytes (API-
   compatible by the library's own design) and wraps the `argon2` devDependency
   for Argon2id. This gives real, standards-compliant cryptographic
   verification under Jest — not a mock — for everything except the
   actual native op-sqlite/SQLCipher integration (item 1) and
   `react-native-keychain` (item 3).
3. **`react-native-keychain` has no Node binding at all.** Mapped to
   `testutils/reactNativeKeychainNodeShim.js`, an in-memory `Map`-backed
   fake. This verifies `getOrCreateDatabaseKey`'s generate-if-absent
   logic correctly, but says nothing about real Keychain/Keystore
   behavior — that needs a real device, same caveat as everything else
   native in this environment.

## What was verified vs. what remains open

**Verified in this pass** (39 tests total, up from 18 after Phase 6):
AES-256-GCM round-trip, wrong-key rejection, tampered-ciphertext
rejection, AAD-tampering rejection; Argon2id determinism and parameter
sensitivity; the full backup file format (create → restore round-trip,
wrong password, tampered payload, tampered header, unrecognized format,
future format version, missing fields) via `BackupAuthenticationError`/
`BackupFormatError`; `getOrCreateDatabaseKey`'s generate-once/reuse logic.

**Not verified in this pass** (same environment limitation recorded since
Phase 5):
- Actual SQLCipher encryption on a real native build — "wrong key fails
  to open the database" is a real-device test, not a Jest test, for the
  reason in tooling finding 1.
- Real Keychain/Keystore behavior (secure enclave availability, biometric
  gating if ever added, behavior across app reinstalls).
- Argon2id parameter benchmarking against a real low/mid-range device —
  `DEFAULT_KDF_PARAMS` in `kdf.ts` remain the same starting values
  (64 MiB / 3 iterations / parallelism 1) carried from the original
  design, still unvalidated.
- Xiaomi/MIUI/HyperOS-specific behavior for any of the new native
  dependencies (per `ADR-010`, this is Phase 14's job regardless).

## What Phase 7 deliberately does not include

Full backup **orchestration** (serializing the live database into a
payload, driving the ten-state restore-safety UI, the safety-backup-
before-replace sequence) is not built here — `backupFile.ts` only knows
how to protect bytes it's handed. Serialization depends on tables not yet
built (`Contract`/`Reminder`, deferred since Phase 6 — see
`phase-6-notes.md`) and the UI-driving state machine is Phase 12/13 work
per the roadmap. This matches Phase 7's original scope ("the backup
create/validate/restore pipeline's **cryptographic core** ... independent
of the UI that will eventually drive it") — only the enterprise-tier
hardening around it was dropped, not the phase's actual deliverable.
