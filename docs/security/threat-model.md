# Threat Model

> **Superseded by `ADR-012-simplified-security-posture.md` (approved).**
> This document's adversarial framing (rooted-device forensics, memory
> extraction, nation-state-tier scenarios) no longer governs
> implementation — AZAR is scoped as a single-agent real-estate CRM, not
> enterprise/financial software. ADR-012 §"Threat model → replaced by a
> short, practical risk list" is the current, authoritative risk model.
> Kept below as historical record only.

Status: DRAFT — extended in the Phase 4 final-architecture pass. Identifies
threats and required mitigations at an architectural level. As of Phase 4,
the encryption **mechanisms** for at-rest data and backups are no longer
open questions — see `ADR-005-local-database-encryption.md` and
`ADR-004-backup-encryption.md` / `backup-encryption-design.md` — both are
still marked PROPOSED pending a dedicated security review, not yet FINAL,
per the standing instruction not to finalize cryptography without one.
Date: 2026-08-08 (extended)

## Assets to protect

1. **Local business data** (owner files, applicant files, requirements,
   notes, contracts, matches, match explanations, reminders, notification
   history) — the sole copy of a user's work, per the local-first model.
2. **Backup files** — portable, potentially stored/transmitted outside the
   app's control by the user (Phase 1 §14).
3. **Session credentials** — grant access to the local database's contents.
4. **Mobile number, OTP codes, referral relationships** — the account/
   referral surface's data, some of it transiently server-side.
5. **Backup encryption key material** — whatever form it takes once §
   backup-architecture's key-management question is resolved.

## Local data protection

**[CONFIRMED — updated after Phase 3 review]** This document previously
framed local database encryption at rest as an open yes/no question. That was
a mistake: it conflated a **requirement** with an **implementation choice**.
The two are now separated explicitly, per the project owner's correction:

- **[CONFIRMED — REQUIRED SECURITY REQUIREMENT]** Sensitive local business
  data (owner files, applicant files, requirements, notes, contracts —
  effectively the full contents of the local database) **must be encrypted
  at rest.** This is not optional and is not merely "defense-in-depth" —
  under the local-first model the local database *is* the only copy of the
  data that exists anywhere (Decision 4), so protecting it at rest is
  mandatory, not a nice-to-have layered on top of a server-side backstop that
  doesn't exist here.
- **[PROPOSED, resolved in Phase 4 — pending dedicated security review]**
  The encryption mechanism is now SQLCipher / AES-256, with the key held
  exclusively in platform secure storage — see
  `ADR-005-local-database-encryption.md` for the full design. Not yet
  FINAL; requires the dedicated security review named there.
- **Threats this requirement addresses**: (1) **local device compromise** —
  malware, a rooted/jailbroken device, or another app exploiting a platform
  vulnerability to read outside its sandbox; (2) **stolen or lost device** —
  physical possession by someone other than the owner, including attempts to
  extract the raw database file via device-level tooling (e.g. a forensic
  extraction) bypassing the lock screen or OS-level protections; platform
  app-sandboxing alone mitigates threat (1) under normal conditions but does
  **not** mitigate (2) once the attacker has physical/forensic-level access
  to the storage — this is precisely why at-rest encryption is required
  rather than treated as redundant with sandboxing.
- **Mitigation direction (not finalized)**: SQLCipher (or an equivalent
  SQLite encryption extension, per ADR-002) is the natural technical pairing
  given the SQLite proposal, but this remains a **[DEFERRED]** implementation
  choice, not a decision made here.

## Secure key storage

- **Threat**: encryption key material (for at-rest DB encryption and/or
  backup encryption) stored insecurely (e.g. in a plain file, hardcoded, or
  in un-sandboxed shared storage) is trivially extractable.
- **Mitigation**: platform secure storage (Keychain/Keystore or the RN/
  Capacitor equivalent abstraction, per ADR-001's "Secure Local Key/Secret
  Storage" component) for any device-held key material. Never store secrets
  in source code (PRODUCT.md's explicit, repeated instruction) or in
  application logs.

## Authentication/session protection

- **Threats**: OTP brute-forcing/abuse (repeated guessing, requesting many
  codes to harass a number or run up delivery cost), session credential
  theft, replay of a captured registration/login request, and — the threat
  this document previously under-specified — **credential/session abuse via
  a mishandled offline/online distinction**: an implementation that logs a
  user out or blocks core functionality merely because a background network
  check failed would itself create an availability problem masquerading as a
  security control, and is called out here as an anti-pattern to guard
  against, not just a UX nuisance.
- **[CONFIRMED — critical local-first rule, added after Phase 3 review]** The
  architecture must clearly distinguish two categories of event, and must
  never conflate them:
  - **NETWORK FAILURE** (no connectivity, request timeout, temporary server
    unavailability, DNS failure, etc.) → the local session **remains valid
    and usable**; the app continues operating fully offline per Decision 4.
    A network failure carries **no information** about whether the session
    is actually still valid server-side — it is simply unknown, and "unknown"
    must never be treated as "revoked."
  - **AUTHENTICATION FAILURE** (the server is reachable and explicitly
    responds that the session is invalid, expired, or revoked) → the defined
    security response applies (the session is treated as ended, and the user
    is required to re-authenticate). This is the *only* case that ends a
    local session as a security response.
  - Full detail, including the specific trade-off this creates, is in
    `/docs/security/authentication-otp-architecture.md`'s revised session
    lifecycle section — this threat model records the requirement; that
    document records the mechanism and its trade-offs.
- **Mitigations**: covered in depth in
  `/docs/security/authentication-otp-architecture.md` — server-side rate
  limiting/retry limits (addressing OTP abuse), single-use time-limited OTPs,
  session revocation capability (triggered only by an explicit
  authentication-failure response, never a network failure), transport
  encryption (HTTPS/TLS) for the entire online surface with no plaintext
  transmission of sensitive data (Phase 1 §18).

## Backup protection

- Covered in depth in `/docs/backup/backup-architecture-analysis.md`:
  authenticated encryption, integrity checking, wrong-key/corruption
  distinguishability, safe rollback on failed restore. The threat model's
  contribution here is naming the specific adversaries:
  - Someone who obtains a backup file (it is explicitly designed to be
    portable and to leave the app's control) must not be able to read it
    without the correct key, and must not be able to tamper with it
    undetected (tampered/malicious backup — see also "Export/import risks"
    below).
  - **Brute-force backup password attempts**: because a backup file is
    portable and can leave the app's control entirely, an attacker with a
    copy of the file can attempt password guesses **completely offline**,
    with no rate limiting the app can enforce (unlike online OTP/login
    guessing, where the backend can throttle attempts). This means the
    backup's resistance to brute-forcing depends entirely on the strength of
    the key-derivation function (KDF) chosen later — a fast/cheap KDF would
    leave backups practically vulnerable to offline dictionary/brute-force
    attacks regardless of any in-app rate limiting, since there is no
    "in-app" for an attacker working directly against a stolen file. **[
    PROPOSED, resolved in Phase 4 — pending dedicated security review]**
    The KDF choice is now concrete: Argon2id, memory-hard, with parameters
    specified in `backup-encryption-design.md` §3 — not yet FINAL, and its
    parameters explicitly still need empirical validation against a real
    minimum-device baseline before implementation locks them in.

## Sensitive data exposure

- **Threat**: sensitive values (mobile numbers, OTP codes, session tokens,
  backup keys) leak via logs, crash reports, or analytics.
- **Mitigation**: **[BUSINESS RULE, Phase 1 §18]** these values are never
  logged in plaintext and never committed to source control — this must be
  enforced by convention/review in implementation (e.g. structured logging
  that redacts known-sensitive fields), not just assumed. If any crash-
  reporting/analytics tool is introduced later, it must be explicitly
  reviewed against this requirement before adoption — none is assumed or
  selected here.

## Logs

- Same requirement as above; additionally, local application logs (if any
  exist for debugging) should avoid persisting business data content
  unnecessarily, consistent with the local-data-is-the-only-copy stakes —
  a verbose local log is itself a secondary, less-protected copy of
  sensitive data if not handled carefully.

## Screenshots / app-switcher privacy

- **Relevant**: yes — a real-estate CRM's file/detail screens likely show
  personally identifiable information (owner/tenant names, phone numbers,
  addresses) and would be visible in the OS app-switcher preview or in a
  screenshot if not addressed.
- **[OPEN-ARCH, UX-dependent]** Whether to blur/obscure the app-switcher
  preview (a platform-level capability on both iOS and Android) for screens
  containing sensitive data is a real consideration to carry into
  implementation, but depends on which screens exist — which in turn depends
  on the not-yet-designed UI (see
  `/docs/architecture/ux-dependencies.md`). Flagged here so it isn't
  forgotten once screens are designed, not resolved now.

## Clipboard risks

- **Relevant, narrowly**: if the app ever supports copying sensitive values
  (e.g. a mobile number, a backup password/key) to the clipboard for user
  convenience, that value becomes readable by any other app with clipboard
  access on many platform versions, and may persist in clipboard-history
  features. **[OPEN-ARCH]** If backup-password entry ever offers a
  "copy to clipboard" convenience, it should be weighed against this risk at
  implementation time — not designed in detail here since it depends on the
  not-yet-designed restore UI.

## Rooted / jailbroken devices

- **Threat**: a rooted (Android) or jailbroken (iOS) device weakens the
  platform's own sandboxing and secure-storage guarantees — the OS-level
  protections `ADR-005-local-database-encryption.md` relies on for key
  storage (Keychain/Keystore) assume an intact platform security model.
  On a rooted/jailbroken device, an attacker with root access can
  potentially read secure-storage contents that would be protected on a
  stock device, or hook the running app's memory to observe secrets in
  use (e.g. a decryption key or backup password, transiently in memory
  during a restore).
- **Mitigation status**: **[OPEN-ARCH]**. At-rest database encryption
  (`ADR-005`) still adds a real layer of protection even here — it is not
  nullified, only weakened, since an attacker still needs to either
  extract the key from compromised secure storage or intercept it in use,
  rather than simply reading an unencrypted file. Root/jailbreak
  *detection* (refusing to run, or warning the user, on a detected
  root/jailbreak) is a common but imperfect mitigation (detection can
  itself be bypassed) — whether to implement it is a product decision not
  made in this document, since it trades off against legitimate users on
  rooted devices for their own reasons (a real, if less common,
  population). Not implementing detection does not remove the underlying
  risk; it only means the app doesn't actively warn about it.
- **Residual risk**: acknowledged, not eliminated. This is stated plainly
  rather than implied away — no mobile app can fully defend against an
  attacker with root-level control of the device it's running on; the
  goal is raising the cost of extraction, not claiming immunity.

## App tampering / repackaging

- **Threat**: an attacker decompiles, modifies, and repackages the app
  (e.g. to bypass a client-side check, or to trojanize it for
  distribution outside official app stores) and distributes the modified
  version.
- **Mitigation status**: **[OPEN-ARCH]**. Standard platform-level
  protections (code signing enforcement by iOS/Android app stores,
  optional additional integrity-check tooling) reduce but do not
  eliminate this risk; specific tooling selection is an implementation-
  phase decision, not made here. The architecture's own defense is
  structural: because every security-relevant decision (referral
  validation, OTP verification, rate limiting) is enforced **server-side**
  per `ADR-009-authentication-boundary.md`, a tampered client cannot
  bypass those checks by modifying local code — it can only misbehave
  against a backend that doesn't trust it in the first place. Tampering
  aimed at the *local* data (e.g. patching the app to skip its own
  encryption) is a different, harder-to-fully-prevent risk on any
  client-side application, mobile or otherwise, and is named here as an
  accepted category of residual risk rather than something this
  architecture claims to solve.

## Replay attacks

- **Threat**: a captured registration or login request (OTP submission,
  session-establishment call) is replayed by an attacker to attempt
  unauthorized access.
- **Mitigation**: **[CONFIRMED requirement]** all traffic on the
  account/referral surface uses transport encryption (HTTPS/TLS), which
  itself substantially mitigates naive replay by a network-position
  attacker. Beyond transport security, OTP codes are **[CONFIRMED,
  single-use]** — even if an OTP submission request were somehow replayed,
  the code itself is invalidated after first successful use
  (`authentication-otp-architecture.md`, "OTP lifecycle"), so a replayed
  request fails, it does not succeed a second time. **[OPEN-ARCH]**
  whether additional replay-specific protections (e.g. request nonces,
  short-lived signed tokens) are needed on top of TLS + single-use codes
  is an implementation-phase judgment call, not resolved here — the
  bounded, small size of the account/referral surface (`ADR-009`) makes
  this a tractable review at implementation time rather than an open
  architectural gap today.

## Notification leakage

- **Threat**: local notifications for contract reminders may display
  contract, owner, or tenant details (e.g. a property address or tenant
  name) on the lock screen or in a notification shade visible to anyone
  with physical proximity to the device, even when it's locked.
- **Mitigation status**: **[OPEN-ARCH, UX-dependent]**. Both major mobile
  platforms support configuring notification content visibility (e.g.
  showing a generic "Contract reminder" on the lock screen while the full
  detail is only visible after unlock) — whether this product uses that
  capability, and what the generic fallback text says, is a UX/copy
  decision (per `/docs/ui/content-style-guide.md`'s rules on writing
  loading/status copy) not made in this document. Flagged here so it is
  designed deliberately once reminder-notification screens exist, not left
  to whatever a scheduling library defaults to.

## Insecure temporary files

- **Threat**: any implementation step that writes intermediate data to a
  temporary file on disk — e.g. staging an incoming restore payload
  before it's validated and swapped in (`local-data-architecture.md`
  §Restore), or an interim decrypted-in-memory-but-spilled-to-disk buffer
  during backup creation/restore — could leave sensitive business data
  briefly readable outside the app's encrypted database if not handled
  carefully.
- **Mitigation — [CONFIRMED, elevated from OPEN-ARCH by the Phase 4B
  security review]**: any staged or temporary database copy created
  during restore or migration **must itself be an encrypted SQLCipher
  database, never a plaintext file, at any point, even transiently** —
  see `backup-encryption-design.md` §11.3 and
  `ADR-005-local-database-encryption.md` for the full requirement and
  rationale. This closes what was previously a general "be careful"
  note with a specific, binding rule: a crash or forensic disk capture
  during a staging window must never expose an unencrypted copy of
  business data.
- **Related, [CONFIRMED, new]**: the app's staging/cache directories must
  be explicitly excluded from OS-level device backup (iOS
  `NSURLIsExcludedFromBackupKey`, Android backup exclusion rules) — see
  `backup-encryption-design.md` §11.4. This is defense in depth on top of
  the encrypted-staging requirement above, closing the path for a staging
  file to leak via an OS-level backup mechanism even if it existed only
  briefly.
- **Related, [CONFIRMED, new]**: on every app startup, the app must check
  known staging locations for leftover files from a previous,
  non-terminated backup or restore operation and delete them once it's
  safe to conclude the prior operation didn't complete — see
  `backup-encryption-design.md` §11.5. Lower severity than the two items
  above once encrypted staging is implemented, since a leftover encrypted
  staging file is a storage-hygiene issue, not a confidentiality one.
- Staging areas must live within the app's private, sandboxed storage
  (never a publicly-accessible or shared location) — unchanged from the
  original note. Concrete implementation now targets React Native
  specifically (`ADR-001`, FINAL) rather than a platform-agnostic
  placeholder.

## Export/import risks

- **Threat**: a maliciously crafted "backup" file is imported and used to
  attack the app (e.g. exploiting a parser bug, or a path-traversal-style
  issue if the format ever includes file paths/names processed unsafely).
- **Mitigation direction**: the restore-validation ordering already specified
  in the backup architecture document (recognize format → integrity check →
  key verification → version check, *before* any content is trusted or
  written) is itself the primary defense — an untrusted file is never parsed
  as trusted business data before passing integrity/authentication checks.
  Implementation must also avoid naive deserialization of untrusted content
  (e.g. no arbitrary code execution paths triggered by opening a backup
  file) — a concrete implementation-phase concern, flagged here as a
  requirement on whatever serialization approach is eventually chosen.

## Threat model summary table

| Threat | Primary asset at risk | Mitigation status |
|---|---|---|
| Local device compromise (malware, sandbox escape) | Local business data | [CONFIRMED REQUIRED] at-rest encryption; [PROPOSED] SQLCipher/AES-256 (ADR-005), pending security review |
| Stolen/lost device (physical/forensic extraction) | Local business data | Same as above |
| Backup file intercepted/stolen in transit (user-chosen transfer method) | Backup contents | [PROPOSED] AES-256-GCM authenticated encryption (ADR-004), pending security review |
| Brute-force backup password (offline, unrateLimitable) | Backup contents | [PROPOSED] Argon2id KDF, parameters in backup-encryption-design.md §3, pending security review and device-baseline validation |
| Tampered/malicious backup import | App integrity, business data | [CONFIRMED] validation ordering (backup-encryption-design.md §6); implementation-phase parser hardening |
| OTP brute-force / abuse (guessing, request flooding) | Account access | [CONFIRMED] rate limiting + retry limits + expiry |
| Referral code abuse (self-referral, mass-registration, reuse) | Referral system integrity | [CONFIRMED] server-side validation + abuse prevention; reuse policy [PRODUCT OWNER DECISION REQUIRED] (ADR-009) |
| Session/credential theft or replay | Account/session access | [OPEN-ARCH] session lifecycle mechanism (ADR-008); revocation trigger [CONFIRMED] to require explicit server-side auth failure, never a network failure; replay mitigated by TLS + single-use OTP, additional protections [OPEN-ARCH] |
| Availability-masquerading-as-security (network failure wrongly treated as revocation) | Legitimate offline access | [CONFIRMED] explicit NETWORK FAILURE vs. AUTHENTICATION FAILURE distinction (ADR-008) |
| Sensitive data in logs | Mobile numbers, OTP, tokens, keys | [CONFIRMED business rule] never logged in plaintext |
| App-switcher/screenshot exposure | Business data (PII) | [OPEN-ARCH, UX-dependent] |
| Clipboard exposure of secrets | Backup password/key | [OPEN-ARCH, UX-dependent] |
| Rooted/jailbroken device | Local business data, secure-storage keys | [OPEN-ARCH] weakened but not eliminated by at-rest encryption; detection tooling not decided |
| App tampering/repackaging | App integrity | [OPEN-ARCH] mitigated structurally by server-side enforcement of all security-relevant checks (ADR-009); no client-side tamper-proofing claimed |
| Notification leakage (lock-screen preview) | Contract/tenant PII | [OPEN-ARCH, UX-dependent] |
| Insecure temporary files (restore staging) | Business data | [OPEN-ARCH] must stay within sandboxed storage, cleaned up promptly; platform-dependent |

## Non-goals (explicitly out of scope, consistent with confirmed decisions)

- Defending against a compromised backend server exfiltrating *business*
  data — there is none stored there (Decision 4). The backend's threat
  surface is limited to the account/referral data it does hold (mobile
  numbers, referral relationships, session records), which is real but
  bounded.
- Multi-device sync attack surfaces (e.g. sync conflict injection) — no
  multi-device sync exists (Phase 1/2 SYNC-02, confirmed non-goal).
- AI-API-related attack surfaces (prompt injection into a hosted matching
  service, etc.) — no AI API is used in the core engine (Decision 3); if a
  future optional natural-language layer is added, its threat model is a
  future document, not retrofitted here.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- At-rest local database encryption **mechanism** is now [PROPOSED]
  (ADR-005) — pending dedicated security review and, before that review,
  not yet FINAL.
- Backup encryption **mechanism** is now [PROPOSED] (ADR-004) — same
  status.
- Session lifecycle mechanism (background re-validation approach) — the
  network-failure-vs-authentication-failure distinction is no longer open
  (ADR-008); the specific re-validation trigger/cadence mechanics remain
  open.
- App-switcher preview obscuring — pending UI design.
- Clipboard handling for sensitive values — pending UI design.
- Root/jailbreak detection tooling — not decided.
- App-tamper-resistance tooling — not decided.
- Notification lock-screen content visibility — pending UX/copy decision.
- Insecure-temporary-file handling during restore staging — platform-
  dependent, pending ADR-001.
- Replay-attack protections beyond TLS + single-use OTP — implementation-
  phase judgment call, not currently flagged as a gap given the bounded
  account/referral surface (ADR-009).
