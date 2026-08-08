# Threat Model

Status: DRAFT — Phase 3 architectural analysis. Identifies threats and
required mitigations at an architectural level; does not finalize
cryptographic or platform-specific implementation details (those remain in
ADR-002, backup analysis, and a future dedicated encryption design step).
Date: 2026-08-08

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
- **[DEFERRED — TBD]** The exact encryption algorithm for at-rest protection
  is not selected in this document.
- **[DEFERRED — TBD]** The exact key-management architecture for at-rest
  protection (how the encryption key is generated, stored, and unlocked —
  e.g. platform secure storage, a user-derived key, or a hybrid, echoing the
  same design space as backup key management) is not selected in this
  document.
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
    "in-app" for an attacker working directly against a stolen file. This is
    recorded here as a hard requirement on the eventual KDF choice
    (`/docs/backup/backup-architecture-analysis.md`'s key-management
    analysis): it must be a deliberately slow, memory-hard KDF (the analysis
    already names Argon2id as a candidate for exactly this reason), not
    merely "some KDF."

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
| Local device compromise (malware, sandbox escape) | Local business data | [CONFIRMED REQUIRED] at-rest encryption; algorithm/key management [DEFERRED] |
| Stolen/lost device (physical/forensic extraction) | Local business data | [CONFIRMED REQUIRED] at-rest encryption; algorithm/key management [DEFERRED] |
| Backup file intercepted/stolen in transit (user-chosen transfer method) | Backup contents | [CONFIRMED direction] authenticated encryption; algorithm [DEFERRED] |
| Brute-force backup password (offline, unrateLimitable) | Backup contents | [CONFIRMED requirement] slow/memory-hard KDF required; specific KDF [DEFERRED] |
| Tampered/malicious backup import | App integrity, business data | [CONFIRMED] validation ordering; implementation-phase parser hardening |
| OTP brute-force / abuse (guessing, request flooding) | Account access | [CONFIRMED] rate limiting + retry limits + expiry |
| Referral code abuse (self-referral, mass-registration, reuse) | Referral system integrity | [CONFIRMED] server-side validation + abuse prevention |
| Session/credential theft or replay | Account/session access | [OPEN-ARCH] session lifecycle mechanism (auth doc); revocation trigger now [CONFIRMED] to require explicit server-side auth failure, never a network failure |
| Availability-masquerading-as-security (network failure wrongly treated as revocation) | Legitimate offline access | [CONFIRMED] explicit NETWORK FAILURE vs. AUTHENTICATION FAILURE distinction (auth doc) |
| Sensitive data in logs | Mobile numbers, OTP, tokens, keys | [CONFIRMED business rule] never logged in plaintext |
| App-switcher/screenshot exposure | Business data (PII) | [OPEN-ARCH, UX-dependent] |
| Clipboard exposure of secrets | Backup password/key | [OPEN-ARCH, UX-dependent] |

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

- At-rest local database encryption **mechanism** (algorithm and key
  management) — the requirement itself is no longer open (§ Local data
  protection above); only the implementation is.
- Session lifecycle mechanism (background re-validation approach) — the
  network-failure-vs-authentication-failure distinction is no longer open;
  the specific re-validation trigger/cadence mechanics remain open (see auth
  doc).
- App-switcher preview obscuring — pending UI design.
- Clipboard handling for sensitive values — pending UI design.
