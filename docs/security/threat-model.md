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

- **Threat**: another app, a file-manager inspection, or a lost/stolen
  unlocked device exposes business data directly from local storage.
- **Mitigation direction (not finalized)**: platform app-sandboxing already
  prevents other apps from reading this app's storage on both major mobile
  OSes; the open question is whether the local database itself should
  additionally be encrypted at rest (e.g. via SQLCipher, mentioned in
  ADR-002) as defense-in-depth against a device-level compromise (rooted/
  jailbroken device, physical extraction). **[OPEN-ARCH]** — flagged for the
  dedicated security design step, not decided here, but the local-first model
  raises the stakes of this decision (Phase 1 §18: "matters more, not less,
  under the local-first model, since business data lives exclusively
  on-device").

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

- **Threats**: OTP brute-forcing, session credential theft, replay of a
  captured registration/login request.
- **Mitigations**: covered in depth in
  `/docs/security/authentication-otp-architecture.md` — server-side rate
  limiting/retry limits, single-use time-limited OTPs, session
  revocation capability, transport encryption (HTTPS/TLS) for the entire
  online surface with no plaintext transmission of sensitive data (Phase 1
  §18).

## Backup protection

- Covered in depth in `/docs/backup/backup-architecture-analysis.md`:
  authenticated encryption, integrity checking, wrong-key/corruption
  distinguishability, safe rollback on failed restore. The threat model's
  contribution here is naming the specific adversary: someone who obtains a
  backup file (it is explicitly designed to be portable and to leave the
  app's control) must not be able to read it without the correct key, and
  must not be able to tamper with it undetected.

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
| Device compromise / lost device reads local DB | Local business data | [OPEN-ARCH] at-rest DB encryption decision pending |
| Backup file intercepted/stolen in transit (user-chosen transfer method) | Backup contents | [CONFIRMED direction] authenticated encryption; algorithm [DEFERRED] |
| OTP brute-force | Account access | [CONFIRMED] rate limiting + retry limits + expiry |
| Referral code abuse (self-referral, mass-registration, reuse) | Referral system integrity | [CONFIRMED] server-side validation + abuse prevention |
| Session theft/replay | Account/session access | [OPEN-ARCH] session lifecycle Option A vs. B (auth doc) |
| Sensitive data in logs | Mobile numbers, OTP, tokens, keys | [CONFIRMED business rule] never logged in plaintext |
| Malicious/corrupted backup import | App integrity, business data | [CONFIRMED] validation ordering; implementation-phase parser hardening |
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

- At-rest local database encryption: yes/no, and if yes, mechanism.
- App-switcher preview obscuring — pending UI design.
- Clipboard handling for sensitive values — pending UI design.
