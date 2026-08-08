# Phase 4B — Dedicated Security Review

> **Superseded by `ADR-012-simplified-security-posture.md` (approved).**
> This review's enterprise-tier findings (native key zeroization,
> mandatory encrypted staging, OS-backup exclusion, crash-remnant
> cleanup, AAD-scope hardening) no longer govern implementation — AZAR's
> security scope was deliberately reduced to match a single-agent
> real-estate CRM. Kept below as historical record only; do not treat its
> requirements as current.

Status: Independent security review of the cryptographic and
restore-safety architecture proposed in Phase 4. This document is the
review itself, not a new architecture proposal — where it finds a real
gap, it says so and points to the specific fix already folded into
`ADR-004`, `ADR-005`, `backup-encryption-design.md`, and
`threat-model.md`; where it confirms the existing design holds up, it says
that plainly too, instead of inventing additional caveats for their own
sake.
Date: 2026-08-08

## 1. Executive summary

The backup-encryption design (AES-256-GCM, Argon2id, a two-tier DEK/KEK
hierarchy) and the local-database-encryption design (SQLCipher/AES-256,
key in platform secure storage) both hold up under adversarial review —
no attacker scenario examined here breaks the core "authenticate before
you trust, and never touch the live database until the incoming data is
already known-good" invariant the restore state machine is built around.
The review surfaced one **HIGH**-severity gap (temporary database copies
during restore/migration could have been implemented as plaintext files),
several **MEDIUM** findings (mostly specification precision and
JavaScript-runtime-specific key-handling), and a handful of **LOW**/
**INFORMATIONAL** items that are worth recording as accepted residual
risk rather than treated as defects. Nothing found here is a **CRITICAL**
finding or an unresolved **HIGH** finding — the HIGH finding (§5,
encrypted staging) already has a concrete requirement written into
`backup-encryption-design.md` §11.3 as a direct result of this review, so
it does not remain open. The gate at the end of this document reflects
that.

## 2. Assets

Unchanged from `/docs/security/threat-model.md` §"Assets to protect" —
restated briefly because this review's findings map directly onto them:
local business data (the sole copy that exists anywhere, under the
local-first model), backup files (portable, outside the app's control once
exported), session credentials, the account/referral surface's data, and
backup/database encryption key material.

## 3. Threat model (scope of this review)

This review does not re-derive `threat-model.md` from scratch — it takes
that document as the baseline and specifically stress-tests the parts of
it that Phase 4/4A turned from open questions into concrete designs:
backup encryption, local database encryption, the restore state machine,
and the pieces of the authentication boundary that touch referral
immutability. Device-security threats (rooted/jailbroken devices, app
tampering, clipboard, notification leakage) were already catalogued in
`threat-model.md`'s Phase 4 extension and are reviewed here for
consistency, not re-analyzed from zero.

## 4. Attack scenarios

The independent cross-check in §9 works through nine specific scenarios
the project owner asked to be tested against. This section names them
once, up front, since they're the organizing structure for most of the
findings below:

1. Attacker has the device (unlocked or forensically imaged).
2. Attacker has only the backup file.
3. The backup file was modified (in transit, in storage, or maliciously
   crafted from scratch).
4. The application crashed during restore.
5. The user forgot the backup password.
6. The application was reinstalled.
7. The application was offline for a long time.
8. The server reports an explicit authentication failure.
9. The server is unreachable.

## 5. Backup encryption review

**Design reviewed**: `ADR-004-backup-encryption.md`,
`backup-encryption-design.md`.

**AES-256-GCM as the AEAD cipher**: sound. Widely audited, hardware-
accelerated on essentially all modern mobile silicon, and gives
confidentiality and integrity in one primitive — exactly what an
untrusted-until-proven-otherwise file format needs. No finding.

**DEK/KEK key hierarchy**: sound, and the specific reasoning (isolating
the expensive Argon2id operation to a small key-unwrap step, and enabling
a future password-change feature without full re-encryption) is a real
engineering benefit, not just a theoretical nicety. No finding.

**Argon2id usage and parameters**: the choice of Argon2id itself is
correct for the stated threat (offline, unrateLimitable password
guessing against a stolen file) — it's the primitive specifically
designed to resist that. The *parameters* (64 MiB / 3 iterations /
parallelism 1) are a reasonable starting point grounded in OWASP guidance,
but this review does not certify them as final, because they haven't been
measured against a real device yet. **Finding (§7 table: PROPOSED, not
FINAL)** — a concrete benchmarking procedure has been added to
`backup-encryption-design.md` §3.1 as a direct output of this review,
specifying the device class, the target 0.5-3 second derivation window,
and which parameter to adjust first if the measurement falls outside it.

**Salt generation**: 32 random bytes per backup, generated fresh — sound.
A salt's job is uniqueness, not secrecy, and storing it in the
unencrypted-but-authenticated header is correct, standard practice.

**Nonce generation**: 12-byte random nonces, one for the DEK-wrap
operation and a separate one for the payload-encryption operation — this
review confirms the design correctly avoids nonce reuse within either
operation, and that reuse *across* different backups is a non-issue by
construction (each backup uses a freshly-generated DEK, so even an
identical nonce value reused across two different backup files would
never pair with the same key twice). No finding.

**Authentication tags**: GCM's built-in 128-bit tag, checked before any
payload byte is trusted — this is the load-bearing property the entire
restore-validation ordering depends on, and it's correctly used that way.
No finding.

**Metadata protection / associated data (AAD)**: **Finding, MEDIUM
(§11.1)** — the original design described "every header field" as AAD to
"both" GCM operations without specifying that the DEK-wrap operation
cannot include its own not-yet-produced output (the wrapped DEK) as its
own input. This was a specification-precision gap, not an exploitable
weakness as actually implementable — any correct implementation would
have had to make the same split this review now makes explicit. Corrected
in `backup-encryption-design.md` §4 and §11.1: the DEK-wrap operation's
AAD is the header fields that exist before wrapping (format/schema
version, timestamp, KDF parameters, salt); the payload-encryption
operation's AAD is the complete header including the now-known wrapped
DEK. Between the two, every header field is covered, and tampering with
any of them is still detected.

**Versioning / downgrade protection**: sound, and stronger than the
original design document stated outright — because the format version is
included in the DEK-wrap AAD (per the correction above), an attacker
cannot roll back the format-version field to try to exploit an older,
less-validated parser version without invalidating the DEK-wrap
authentication tag. This is a real protection the AAD design already
provides; it just wasn't named explicitly as "downgrade protection"
before. No finding beyond noting it should be described that way, which
this review now does.

**Password security**: reviewed against the explicit instruction that the
attacker must be assumed to possess the backup file completely offline,
with no rate limiting or server-side protection available. The design
already reflects this correctly — Argon2id specifically because it's not
vulnerable to the "just add rate limiting" mitigation that works for
online guessing. The password is never stored, in any form, anywhere;
never logged (per `threat-model.md`'s existing blanket rule, which this
review confirms applies here without needing a backup-specific carve-out);
and never written into backup metadata (the header contains KDF
parameters and salt, never the password or any value directly derived
from it in a way that could be reversed without the KDF's full cost). No
finding on the policy; see §7's note on crash-report scope for one
adjacent clarification.

## 6. Local database encryption review

**Design reviewed**: `ADR-005-local-database-encryption.md`.

**SQLCipher architecture**: sound choice — mature, page-level, transparent
AES encryption that doesn't require selectively remembering which columns
are "sensitive enough" to encrypt, which is exactly the kind of
completeness guarantee this local-first product needs given the local
database is the only copy of a user's data that exists.

**Database key generation**: a 256-bit key from the platform's secure
random number generator at first launch — sound, standard practice.

**Secure key storage**: iOS Keychain / Android Keystore, hardware-backed
where available, never written to the database file or plain app storage
— sound, and consistent with the same pattern already used for session
credentials.

**Key lifecycle**: generation is well-specified; **rotation is explicitly
out of scope** for this pass, which this review agrees with as a
reasonable scoping decision — key rotation for an at-rest database key
that's never exposed outside secure storage is a real feature with real
design questions (re-encrypting a potentially large database without a
window of vulnerability), but it is not blocking anything else in this
document set and does not need to be solved before implementation can
begin on everything else.

**App reinstall / device migration**: correctly analyzed as an accepted
consequence, not a bug — the key doesn't (and shouldn't) survive a
reinstall in a way that would make it portable, because portability is
what the backup format (a structurally separate key) exists for. This
review confirms that separation is real, not just asserted: the two key
hierarchies (backup DEK/KEK vs. local database key) share no key material
and no derivation path.

**Backup interaction**: creating a backup means decrypting the live
database (using the local DB key, in memory) and re-encrypting under an
independent backup DEK/KEK — this review specifically checked that this
decrypt-then-reencrypt step doesn't introduce a plaintext-on-disk window,
and found that it doesn't *by design*, but that the design didn't
previously say so explicitly for the *staging* side of this operation —
see §5's finding folded forward into the temp-file review below.

**Database corruption**: not deeply analyzed in this document — SQLCipher
inherits SQLite's own corruption-detection characteristics (page checksums
are not a default SQLite feature; corruption is more commonly detected at
read time when a page fails to parse) plus this product's own
`local-data-architecture.md` open item about whether to add an additional
live-file checksum. This review does not add new requirements here beyond
what's already tracked as open in that document — it is not a
security-critical gap, since a corrupted database is a reliability
problem the backup/restore flow already exists to recover from, not a
confidentiality problem.

**Temporary database copies**: **this is the review's most significant
finding — see §9 below (HIGH).**

## 7. Key-management review

Covered across §5 and §6 above; consolidated status table:

| Decision | Status | Basis |
|---|---|---|
| AES-256-GCM as backup AEAD cipher | **FINAL** | Well-established, industry-standard, no device-specific tuning needed — unlike the KDF, there's no empirical step left before this can be considered settled. |
| Argon2id as backup KDF | **FINAL** (algorithm choice) / **PROPOSED** (specific parameters) | Algorithm choice is settled — it's the correct primitive for this exact threat (offline password guessing) and there's no serious competing choice for this specific case. Parameters remain PROPOSED, pending the benchmarking procedure in `backup-encryption-design.md` §3.1. |
| DEK/KEK two-tier hierarchy | **FINAL** | Structural decision, not device-dependent; the reasoning holds regardless of parameter tuning. |
| SQLCipher/AES-256 for local DB | **PROPOSED** | Sound design; still requires a review of the actual implementation once written, per standing instruction, before FINAL. |
| Key storage (Keychain/Keystore) | **FINAL** | Standard platform mechanism, no reasonable alternative for this product's requirements. |
| Key rotation (local DB) | **OPEN** | Explicitly out of scope for this pass — not blocking, not a gap in the current requirement, a future feature. |
| Encrypted staging for restore/migration temp files | **FINAL (requirement)**, implementation itself still to be built | This review's own output — see §9. The *requirement* is settled; there's no design ambiguity left to resolve, only code to write. |
| Native-binding key zeroization | **FINAL (requirement)** | Same as above — the requirement is unambiguous; which specific native library fulfills it is an implementation choice, not an open design question. |
| OS-backup exclusion for staging paths | **FINAL (requirement)** | Standard platform API on both iOS and Android; no design ambiguity. |

**On not silently marking things FINAL**: AES-256-GCM and the DEK/KEK
structure are marked FINAL above because there is no empirical or
device-specific step left for them — marking them PROPOSED indefinitely
would just be false modesty, not rigor. Argon2id's *parameters* and
SQLCipher's *implementation* are kept at PROPOSED specifically because a
concrete, unfinished next step exists for each (the benchmarking
procedure; the implementation review) — that's the actual distinction
this review is drawing, not a blanket reluctance to finalize anything
cryptographic.

## 8. Restore security review

**State machine reviewed**: `04-final-architecture.md` §7.

Walked through the full state sequence (Existing Data → Safety Backup →
Safety Backup Verification → Replace Confirmation → Restore → Validation
→ Completion) against two specific questions:

**"Can a malformed or malicious backup overwrite existing data before
validation?"** No. The state machine's `RESTORING` state is only entered
after the incoming backup has already passed every check in
`backup-encryption-design.md` §6 (format recognition through structural
validation) — and even within `RESTORING`, the incoming data is staged,
not applied incrementally to the live database. The live database is
never touched until the `ATOMIC_SWAP` state, which only follows a fully
validated, fully staged replacement. This holds regardless of *why* a
backup is malformed or malicious — a corrupted file, a tampered file, and
a deliberately hand-crafted malicious file all fail at the same
authentication/validation gate before `RESTORING` is ever reached, or
they fail within `RESTORING`'s own staging validation before
`ATOMIC_SWAP`.

**"Can a failed restore leave the application with a partially restored
database?"** No, by construction — the swap is atomic (a single rename-
style operation on the same filesystem volume, not an incremental
field-by-field write), and it's the last step in the sequence, not an
early one. Every failure mode upstream of `ATOMIC_SWAP` leaves the
pre-restore live database completely untouched; the only way the live
database changes at all is a fully-succeeded swap of a fully-validated
staged copy. There is no code path in this design where "restore failed"
and "live database was modified" are both true.

**One precondition this review flags rather than treats as already
solved**: the atomicity guarantee above depends on the staged database
and the live database living on the *same filesystem volume*, since a
rename-based atomic swap only works within one volume — if a future
implementation ever stages to a different volume (e.g. external/removable
storage on Android), the swap would need to become a copy-then-verify-
then-delete-old sequence instead, which is not atomic in the same sense
and would need its own analysis. **[OPEN-ARCH, flagged for
implementation]** — not a defect in the current design, since nothing
in this document set proposes staging outside the app's own private
volume, but worth stating as an assumption the design depends on rather
than leaving implicit.

## 9. Temporary-file review

This is where the review's most significant finding lives.

**Backup temporary files / restore staging files**: **Finding — HIGH.**
The pre-Phase-4B documents (`threat-model.md`'s original "Insecure
temporary files" section, `backup-architecture-analysis.md`'s "Safe
rollback" section) both correctly identified that a staging area would be
needed during restore, and both said it should "avoid writing decrypted
business data to disk where feasible" — but neither made it a hard
requirement that a staged database copy must itself be encrypted. Read
literally, "where feasible" leaves room for an implementation to
reasonably conclude that, for a large dataset, an in-memory-only staging
approach isn't feasible, and fall back to a plaintext scratch file "just
for staging, just temporarily." That's exactly the gap: a temporary
plaintext copy of the full business-data snapshot, even one that exists
for a few seconds, is a real exposure window — a crash during that window,
a forensic disk image taken during it, or (on a device without full-disk
encryption, or with an unlocked device already compromised) a background
process reading app-private storage during it, could all recover the
plaintext.

**Resolution**: `backup-encryption-design.md` §11.3 now states this as a
binding requirement, not a suggestion — any staged or temporary database
copy must be created as an encrypted SQLCipher database, full stop, no
"where feasible" qualifier. `ADR-005` carries the same requirement.
This is why the finding does not remain open at HIGH severity in this
review's gate determination (§18) — the architectural fix is written and
in place; what remains is implementing it correctly, which is normal
implementation work, not an open design question.

**Extraction directories / imported files**: the same requirement covers
this — an imported backup file itself arrives already encrypted (that's
its whole format) and is never decrypted to a plaintext intermediate file;
decryption happens directly into the staged, re-encrypted database
copy, or into memory for validation steps that don't need persistence.

**Crash remnants**: covered by §11.5's new requirement — a
previous-session staging file must be swept on next startup. Rated LOW
severity specifically because, once §11.3's encryption requirement is
implemented, a crash remnant is an unencrypted-looking file only in the
sense that its *existence* is detectable, not its *contents* — the
confidentiality risk is already closed by §11.3; this is cleanup hygiene
layered on top.

**OS backup behavior**: covered by §11.4's new requirement (explicit
exclusion of staging/cache paths from iOS/Android device backup) — rated
MEDIUM, defense-in-depth on top of §11.3 rather than an independent
confidentiality hole, since §11.3 already ensures nothing unencrypted
exists to be swept up by an OS backup in the first place.

## 10. Device compromise review

Reviewed against `threat-model.md`'s Phase 4 extensions (rooted/
jailbroken devices, app tampering, clipboard, notification leakage,
screenshots/app-switcher). This review's contribution is making the
protection/mitigation/detection/residual-risk distinction explicit for
each, since the brief specifically asked for that framing and the prior
documents didn't always separate it cleanly:

| Threat | Protection | Mitigation | Detection | Residual risk |
|---|---|---|---|---|
| Rooted/jailbroken device | At-rest DB encryption (`ADR-005`) still requires the attacker to extract or misuse the key, not just read a file | None beyond the encryption itself unless root/jailbreak detection is built (not decided) | Root/jailbreak detection is possible but not implemented in this design | **Accepted**: a sufficiently privileged attacker on the device itself can eventually access anything the running app can access. No mobile app fully closes this. |
| App tampering/repackaging | Server-side enforcement of all account/referral logic (`ADR-009`) means a tampered client can't bypass those checks | Platform code-signing (App Store/Play Store distribution) | Not designed here | **Accepted**: a sideloaded, tampered client attacking only *local* data on its own device is a different, harder-to-fully-prevent category than one attacking the server. |
| Stolen, unlocked device | At-rest encryption via secure-storage-held key means the app itself still enforces its own access (e.g. any app-level lock screen, if built) | An app-level PIN/biometric gate is named as an open, UX-dependent mitigation, not yet designed | N/A | **Accepted, and named explicitly** in `authentication-otp-architecture.md`'s "remaining security trade-off" — an unlocked device is functionally equivalent to the legitimate user for local data access, same as almost any mobile app. |
| Clipboard exposure of backup password | N/A — the password is never programmatically copied to clipboard by app logic | Avoiding a "copy to clipboard" convenience feature for password fields | N/A | **Open, UX-dependent** — not decided either way yet. |
| Notification lock-screen leakage | Platform notification-content-visibility settings exist and could be used | Generic lock-screen text instead of full contract/tenant detail | N/A | **Open, UX-dependent** — flagged, not designed. |
| Memory exposure (key material in RAM) | Native-binding zeroization requirement (§11.2, new) reduces the window key material is resident and readable | Same | N/A | **Accepted, reduced but not eliminated** — no mobile runtime can guarantee zero-residency of sensitive values against a sufficiently capable memory-forensics attacker with an unlocked or compromised device; the requirement narrows the window, it doesn't close it to zero. |

This review does not claim any of the "Accepted" residual risks above can
be eliminated — they're named as accepted, bounded risk, consistent with
the instruction not to claim impossible security.

## 11. Authentication boundary review

Reviewed `ADR-009-authentication-boundary.md` against the two scenarios
most relevant here: server-reachable-but-says-no, and server-unreachable.
Both are already correctly handled by `ADR-008`'s NETWORK FAILURE vs.
AUTHENTICATION FAILURE distinction, and this review found no gap in that
logic — see §9's cross-check answers 8 and 9 for the specific walk-
through. The boundary itself (five operations, server holds only what
those five operations need, no business-data endpoints) remains sound and
unchanged by this review.

## 12. Referral abuse review

The newly-finalized immutability rule (`ADR-009` §"Referral reuse
policy") closes a real gap this review specifically checked for: without
immutability, a compromised or malicious client could attempt to replay a
registration-style request post-registration to attach a second referral
relationship, effectively laundering a self-referral or a fraudulent
referral chain after the fact, when server-side registration-time checks
might no longer be in the code path being hit. Immutability, enforced
server-side as an update-rejection rather than only a creation-time check,
closes that path structurally — there is no "referral update" operation
for an attacker to target at all. No further finding.

## 13. Privacy review

- The account/referral backend stores the minimum data the five online
  operations require (`ADR-009`) — mobile number, OTP state, referral
  relationship, session records — and explicitly does not store business
  data, consistent with the product's local-first commitment. This
  remains the strongest privacy property of the whole system: there is no
  server-side copy of a user's client/property/contract data to be
  breached, subpoenaed, or leaked from a server the product doesn't
  operate a business-data store on.
- Contract/tenant PII appearing in local notification previews (§10
  above) is the one privacy-relevant item this review flags as still
  open and UX-dependent — worth resolving before those specific screens
  are implemented, not before the rest of Phase 4 proceeds.
- No new privacy findings beyond what `threat-model.md` already
  documents.

## 14. Findings (consolidated)

| # | Finding | Section | Severity |
|---|---|---|---|
| F1 | AAD scope for DEK-wrap vs. payload-encryption GCM operations was underspecified | §5 / backup-encryption-design.md §11.1 | MEDIUM |
| F2 | Key material (password, KEK, DEK) has no zeroization guarantee in a pure-JS runtime | §5 / §11.2 | MEDIUM |
| F3 | Restore/migration staging copies were not explicitly required to be encrypted | §9 / §11.3 | **HIGH** |
| F4 | Staging/cache paths were not explicitly required to be excluded from OS-level device backup | §9 / §11.4 | MEDIUM |
| F5 | No explicit requirement to clean up staging files left by a crashed session | §9 / §11.5 | LOW |
| F6 | Payload deserialization safety (prototype pollution, resource exhaustion) not explicitly named | §9 / §11.6 | LOW |
| F7 | Argon2id parameters are a reasonable starting point but unvalidated against real hardware | §5 / §3.1 | INFORMATIONAL (tracked as a required pre-FINAL step, not a defect) |
| F8 | Restore atomic-swap assumes staging and live database share one filesystem volume | §8 | LOW (design assumption, not currently violated by anything proposed) |

## 15. Severity

Using the scale requested: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL.
**No CRITICAL findings.** **One HIGH finding (F3), already resolved at
the architecture level** by the new requirement in
`backup-encryption-design.md` §11.3 and `ADR-005` — it does not remain
open as an unresolved HIGH, which is the specific condition that would
block a PASSED gate.

## 16. Recommended mitigations

All findings' mitigations are already written into the relevant documents
as part of this review — this section exists to confirm none were left as
narrative-only observations:

- F1 → `backup-encryption-design.md` §4 (corrected) and §11.1.
- F2 → `backup-encryption-design.md` §11.2, `ADR-005` (Phase 4B additions).
- F3 → `backup-encryption-design.md` §11.3, `ADR-005`, `threat-model.md`
  ("Insecure temporary files," now CONFIRMED).
- F4 → `backup-encryption-design.md` §11.4, `ADR-005`, `threat-model.md`.
- F5 → `backup-encryption-design.md` §11.5, `threat-model.md`.
- F6 → `backup-encryption-design.md` §11.6.
- F7 → `backup-encryption-design.md` §3.1 (benchmarking procedure).
- F8 → named explicitly in this document (§8); no design change proposed
  since nothing currently contradicts the same-volume assumption.

## 17. Residual risks

Stated plainly, per the instruction not to claim impossible security:

- A stolen, **unlocked** device (or one where the attacker has the
  device's unlock credential) grants the same local-data access a
  legitimate user has — no encryption scheme defends against a fully
  authenticated session on a device the attacker controls. This is named,
  not solved, in `authentication-otp-architecture.md` and restated here.
- A rooted/jailbroken device weakens, but does not eliminate, the
  protection at-rest encryption provides — an attacker with root-level
  control has a materially easier path to key extraction than one
  without it.
- Memory-forensics attacks against a running or recently-running app
  remain possible in principle even with the native-binding zeroization
  requirement (F2's mitigation) — zeroization narrows the exposure
  window, it does not guarantee zero residency against a sufficiently
  resourced attacker.
- SMS-based OTP (once a provider is selected, `ADR-003`) carries the
  industry-wide, well-known residual risk of SIM-swap and SS7-level
  interception — this is a property of SMS as a delivery channel, not
  something this application's architecture can mitigate directly; it is
  named here as an accepted, external risk rather than a gap in this
  design.
- A forgotten backup password is, by design, unrecoverable — not a
  residual risk to mitigate, but a deliberate consequence of the
  encryption actually depending on the password, restated here because
  §9's cross-check specifically asks about this scenario.

## 18. Decisions requiring approval

- **[PRODUCT OWNER DECISION REQUIRED]** Minimum supported OS version /
  device tier — needed before the Argon2id benchmarking procedure
  (§3.1 of `backup-encryption-design.md`) can be executed against a real
  "lowest-spec supported device."
- **[PRODUCT OWNER DECISION REQUIRED, or UX-dependent]** App-level PIN/
  biometric gate as a mitigation for the stolen-unlocked-device residual
  risk — named, not designed, consistent with prior documents.
- **[PRODUCT OWNER DECISION REQUIRED, or UX-dependent]** Notification
  lock-screen content visibility and clipboard handling for the backup
  password field — both still open.
- **Sign-off needed**: this document constitutes the dedicated
  cryptographic design review the project has consistently required
  before treating `ADR-004`/`ADR-005` as FINAL. It found the *design*
  sound with the corrections above folded in. A second review of the
  actual *implementation*, once code exists, is still required before
  either ADR moves from PROPOSED to FINAL — this review does not and
  cannot substitute for that.

## Independent cross-check (second-pass review)

The primary review above (§1-§18) already folds in everything this
second pass found — the two passes were done together, not sequentially
with the first pass "locked" before the second began, so nothing here
contradicts the findings above. This section exists to show the specific
adversarial questions the project owner asked to be tested against, and
to confirm each one traces back to a specific answer in the design rather
than being asserted without support.

**"What would break if the attacker had the device?"** Nothing at the
encryption-at-rest layer breaks outright — the database remains
SQLCipher-encrypted and the key remains in secure storage, not the
database file. What "breaks" is the same thing that breaks for almost any
mobile app: if the device is *unlocked* (or the attacker has the unlock
credential), they have the same access the legitimate user does, because
the app's own authorization at that point is "is this a valid,
authenticated session on this device," which a physically-present
attacker with the device unlocked satisfies. This is named as accepted
residual risk (§17), not fixed.

**"What would break if the attacker only had the backup?"** Nothing,
assuming the backup password is strong and the Argon2id parameters (once
benchmarked, §3.1) are adequate — the attacker faces the full cost of
Argon2id per guess, offline, with no rate limit to exploit or bypass, and
no way to distinguish a "close" password guess from a "far" one (AEAD
gives no partial-credit signal). This is exactly the scenario the whole
backup-encryption design is built around, and it holds.

**"What would break if the backup was modified?"** Nothing gets trusted —
either the modification is caught at the AAD/authentication-tag level
(§5, §11.1) before any content is parsed, or, in the vanishingly unlikely
case of an undetected modification (which would require breaking GCM's
authentication guarantee itself, not a design gap), the structural
validation step (§6 of `backup-encryption-design.md`) provides a second
layer before the data would ever be trusted as valid business data.

**"What would break if the application crashed during restore?"**
Nothing gets left in a partially-restored state (§8) — the live database
is untouched until a single atomic swap of an already-fully-validated
staged copy. What *could* have broken, before this review, is a plaintext
staging remnant being left behind readable (F3) — now closed by the
encrypted-staging requirement, with cleanup handled by F5's mitigation.

**"What would break if the user forgot the backup password?"** The backup
becomes permanently unreadable — by design, not as a bug. This is stated
plainly in `backup-encryption-design.md` §7 and restated in this review's
§17: a recoverable password would mean the encryption doesn't actually
depend on the password, which defeats its purpose. The *product*
consequence (a real, if rare, support/UX situation) is worth the UI
copy explicitly warning about this at password-setting time — already
noted in the design document, a content/UX matter, not a security gap.

**"What would happen after reinstalling the application?"** The local
database's encryption key does not survive (§6) — this is correct and
expected, not a bug, since the key was never meant to be portable; the
portable path is a password-protected backup. A user who reinstalls
without a backup loses their local data, which is the same
"no safety net without a backup" property `local-data-architecture.md`
already names as the central risk of the local-first model — reinstall
is simply one more trigger for that same, already-documented risk, not a
new one.

**"What happens when the application is offline for a long time?"**
Nothing changes for local business-data functionality — every offline
workflow (file management, matching, contracts, reminders, backup/
restore) continues to work indefinitely with no time-based degradation,
per `ADR-008`'s NETWORK FAILURE handling and the offline/online boundary
in `04-final-architecture.md` §4. A long offline period simply means the
opportunistic background re-validation check (still open-mechanism, per
`ADR-008`) never gets a chance to run — which is explicitly *not* treated
as a reason to end the session.

**"What happens when the server reports authentication failure?"** The
one and only case that ends a local session, per `ADR-008`'s table — the
session is treated as ended and the user must re-authenticate. This
requires the server to be reachable AND to explicitly respond with an
invalid/expired/revoked status; this review confirms no other condition
in the design produces this outcome, so there's no path for a network
hiccup to be misclassified as this case.

**"What happens when the server is unreachable?"** NETWORK FAILURE, per
the same table — the session remains valid and usable, no re-validation
attempt is made (or, if one is in flight, its failure is discarded as "no
new information"), and every offline business-data workflow continues
unaffected. This review specifically checked that no code path in the
reviewed documents conflates "unreachable" with "revoked," and found
none — the distinction is maintained consistently across
`authentication-otp-architecture.md`, `ADR-008`, and `threat-model.md`.
