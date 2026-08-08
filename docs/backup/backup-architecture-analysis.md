# Backup Architecture Analysis

Status: DRAFT — Phase 3 architectural analysis. Per explicit instruction, this
document analyzes options and trade-offs; it does **not** select a final
encryption algorithm or key-management implementation. That selection belongs
to a dedicated later security design step (previously anticipated as
`/docs/security/encryption.md` in the original phased plan) once this
analysis is reviewed.
Date: 2026-08-08

## Constraints carried in

**[CONFIRMED]** Backup must be encrypted, portable, and locally controlled; no
cloud backup is required (Phase 0 Decision 4, Phase 1 §14). Backup creation,
import, validation, and restore are all OFFLINE workflows (§4a). The backup
must not be readable as application business data without the app's
decryption mechanism (PRODUCT.md's original instruction, restated in Phase 0
§2a).

## Backup format

- **[OPEN-ARCH]** The concrete byte-level format is an implementation detail,
  but this document establishes the required structure any format must have:
  1. A **header** (unencrypted, or encrypted separately from the payload)
     containing at minimum: format version, schema version the payload was
     created against, creation timestamp, and enough information to identify
     *that* a password/key is required and *how* to derive/verify it (e.g.
     key-derivation parameters) — without exposing any business data.
  2. An **encrypted payload** containing the actual business data snapshot
     (from the local database, per
     `/docs/local-data/local-data-architecture.md`'s backup-extraction
     approach).
  3. An **integrity/authentication value** covering the encrypted payload (and
     ideally the header) so tampering or corruption is detectable before any
     decrypted data is trusted (see "Integrity/authentication" below).
- **Portability**: the format should be a single self-contained file (or a
  small fixed set of files bundled into one container) so "store it anywhere,
  transfer it to another device" (Phase 1 §14) is a simple file-copy
  operation, not a multi-file transfer the user could get wrong.

## Encryption requirements (analysis, not selection)

- **[CONFIRMED requirement]**: authenticated encryption — confidentiality and
  integrity together — not encryption alone. An algorithm chosen later must
  provide both, so that a tampered backup is *detected*, not merely
  undecryptable-looking.
- **Candidate families to evaluate later** (documented here as the option set
  a future decision should choose from, not as a decision):
  - **Symmetric authenticated encryption** (e.g. AES-GCM or an equivalent
    AEAD cipher) — the standard, well-audited approach for "encrypt a blob
    with a key derived from a user secret," directly satisfying the
    authenticated-encryption requirement above.
  - **A modern AEAD alternative** (e.g. ChaCha20-Poly1305) — relevant mainly
    if the target platforms/hardware make one meaningfully faster than the
    other; a performance question to answer empirically later, not
    architecturally now.
  - Whatever is chosen, PRODUCT.md's explicit instruction stands: **use
    well-established, audited cryptographic primitives — do not invent
    cryptography.** This document does not propose inventing anything; it
    defers the specific pick.

## Key management options (analysis, not selection)

Three structurally different approaches, to be weighed later:

1. **User-supplied password, key derived via a password-based KDF** (e.g.
   Argon2id or PBKDF2/scrypt-class functions) — the user remembers a backup
   password; nothing is stored on-device that alone unlocks the backup. Pro:
   works even if the originating device is lost, since the secret lives in
   the user's memory, not their device. Con: a forgotten password is
   genuinely, correctly unrecoverable — there is no "reset" path for
   encrypted data without weakening the encryption's purpose.
2. **Device-generated key, held in platform secure storage (Keychain/
   Keystore), never shown to the user** — strong security property (no weak
   human-chosen password), but the backup becomes only meaningfully
   restorable *from that same device's secure storage*, undermining the
   "restore on another device" requirement unless the key material is itself
   exported (which reintroduces the password-protection question one level
   up).
3. **Hybrid**: a device-held key protects day-to-day local encryption-at-rest
   (if the local database itself is encrypted, per ADR-002's SQLCipher
   mention), while backup export specifically uses a user-supplied
   password-derived key independent of any single device's secure storage —
   satisfying both "strong local protection" and "genuinely portable backup"
   without conflating the two.

**[OPEN-ARCH]** This document recommends the hybrid approach (3) as the
shape most consistent with both "secure key storage" and "portable to another
device" requirements pulling in different directions, but does not finalize
it — the actual KDF parameters, key sizes, and exact flow are left to the
dedicated security design step, consistent with the instruction not to choose
key management here.

## Integrity / authentication

- Already covered structurally above (AEAD provides this if chosen), but
  called out separately because it drives specific restore-time UX/behavior:
  a backup that fails its integrity/authentication check must be rejected
  **before** any attempt to interpret its contents as business data — never
  "decrypt first, validate structure second," which risks processing
  attacker-controlled or corrupted bytes as if they were trusted data.

## Versioning

- The backup header's format-version and schema-version fields (above) are
  the mechanism; the **policy** (how many prior versions remain restorable,
  whether older backups are migrated forward on restore or rejected with
  guidance) is a product decision already flagged as open in Phase 1 §14 and
  carried here — this document does not resolve it, only confirms the
  mechanism needed to support whatever policy is chosen.

## Portability

- Already addressed under "Backup format" — single self-contained file,
  independent of any specific device's secure storage if the hybrid
  key-management approach is adopted.
- **[OPEN-ARCH]** Whether the app should also support integrations with a
  user's own cloud-storage app (e.g. offering a native "share/save to..."
  sheet after export) is worth noting: this is fully consistent with
  local-first — the *app* isn't managing cloud storage, the *user* chooses
  where the file goes via a standard OS share mechanism, matching Phase 1
  §14's "the app itself does not require or manage any such destination."
  This is a UX-dependent decision (see `/docs/architecture/ux-dependencies.md`)
  more than a backup-architecture one.

## Corruption detection

- Handled by the integrity/authentication value above. Architecturally, this
  means restore must always perform integrity verification as a distinct,
  first step with its own distinct failure message (RST-03) — never
  conflated with a decryption failure (RST-02, see "wrong-password behavior"
  below).

## Wrong-password behavior

- **[CONFIRMED requirement]**: distinguishable from corruption (Phase 1 §14,
  RST-02). Architecturally, this requires the format to support detecting
  "the provided key/password does not match this backup" *before* fully
  decrypting and attempting to parse the payload as business data — otherwise
  a wrong password and a corrupted file could both simply produce garbage
  data with no way to tell which happened. An AEAD's authentication tag
  naturally supports this distinction (auth failure vs. a separate structural
  parse failure after successful decryption) but the exact mechanics depend
  on the algorithm chosen later.

## Restore validation

- A restore must pass, in order: (1) file/format recognition (is this even a
  backup file — IE-02), (2) integrity/authentication check (RST-03), (3)
  key/password verification (RST-02), (4) version-compatibility check
  (RST-04), before any data is written to the live local database. This
  ordering matters: it ensures the most specific, most actionable error is
  always the one shown, rather than a generic failure.

## Restore to a device containing existing data

- **[OPEN-ARCH — carried from Phase 1/2, RST-05]** Whether restore blocks
  pending explicit user confirmation or overwrites existing local data is not
  decided here. This document adds the structural requirement that whichever
  policy is chosen, the restore process itself must be staged (see "Safe
  rollback" below) so the decision of *what* to do about existing data is
  cleanly separable from *how* the restore is mechanically executed.

## Safe rollback if restore fails

- **[CONFIRMED requirement, elevated by the local-first model]**: since the
  local database is the sole copy of a user's data, a restore that fails
  partway through must never leave the device in a state worse than before
  the restore began. Architecturally: the restore process should write the
  incoming backup's data to a staging area (or a new database file/
  transaction) fully, validate it completely, and only then atomically swap
  it in as the live database — the pre-restore live database is not touched
  or discarded until the incoming data is confirmed fully valid and applied.
  If any step fails, the device is left exactly as it was before the restore
  attempt started.

## Risks

- Key-management is the single highest-consequence unresolved decision in
  this entire document set: get it wrong (e.g. a device-only key with no
  portable path) and the "restore on another device" requirement silently
  breaks; get it wrong the other way (e.g. a weak password-only scheme with
  no rate-limiting on guess attempts, if ever exposed to online guessing)
  and backups become the weakest link in the whole security model. This is
  exactly why it's deferred to a dedicated, focused design step rather than
  decided as a side effect of this broader Phase 3 pass.
- "Do not invent cryptography" cuts against building anything bespoke here,
  including a bespoke KDF or a bespoke authenticated-encryption construction
  — the eventual decision should select from well-established libraries/
  primitives, not assemble one from parts.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Final encryption algorithm and KDF selection.
- Final key-management model (device-only vs. password-only vs. hybrid — this
  document proposes hybrid but does not finalize it).
- Backup version-compatibility policy (migrate-forward vs. reject window).
- Restore-onto-existing-data behavior (block vs. overwrite).
