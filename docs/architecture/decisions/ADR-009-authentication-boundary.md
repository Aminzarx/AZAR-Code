# ADR-009 — Authentication & Referral Boundary

Status: **CONFIRMED** (boundary and flow shape) with several
**[OPEN-ARCH]**/**[PRODUCT OWNER DECISION REQUIRED]** items named below.
See `/docs/security/authentication-otp-architecture.md` for the full
analysis; this ADR records the decision in the standard ADR shape. Named
`ADR-009` rather than `ADR-003` because `ADR-003` already exists in this
project for a narrower, distinct decision (OTP/SMS provider vendor
selection, explicitly deferred) — this ADR is about the *shape and scope*
of the online surface itself, which is a separate question from which
vendor eventually sends the SMS.

## Context

Phase 0 Decision 4 drew a hard line: the only parts of this product that
require connectivity are registration, OTP send/verification, referral
validation, recording the registered phone/referral relationship, and
establishing/revalidating a session. Everything else — all business-data
functionality — is offline by requirement. This ADR fixes the shape of
that one online surface so it stays small, auditable, and never grows into
a general-purpose backend by accretion.

## Decision

**Registration flow:**

```
Mobile Number → OTP send → OTP verify → Referral Code entry
  → Server-side referral validation → Account registration
  → Local authenticated session established
```

- OTP state (issued code, timestamp, attempt count) lives **entirely
  server-side** — the client is never trusted to self-report successful
  verification.
- Referral validation is **mandatory and server-side only**: a code must
  exist, must not resolve to the same user attempting to use it (no
  self-referral), and is checked against whatever reuse policy is decided
  (see open items below).
- The server records **only** what these five online operations require:
  the mobile number, OTP delivery/verification state, the referral
  relationship (who referred whom), and session records. It does not
  store owner files, applicant files, contracts, matches, notes, or any
  other business data — there is no server-side business database, by
  Decision 4, and this ADR does not create one by omission.
- Once a session is established, it is used purely locally to gate access
  to the local database (`ADR-008` governs its lifecycle from that point
  on).

## Alternatives considered

- **A general-purpose backend API surface** (e.g. exposing business-data
  CRUD endpoints even if unused by the current UI) — rejected: directly
  contradicts Decision 4 and would create a server-side business-data
  attack surface and a data-residency/compliance question the product
  explicitly does not need to have.
- **Client-side referral/OTP validation** (trusting the client to enforce
  "code is valid," "not self-referred," etc.) — rejected: trivially
  bypassable by anyone inspecting or replaying requests; server-side
  validation is the only version of this that actually enforces anything.
- **Folding referral validation into the same request as OTP verification**
  (a single combined step) — not adopted as the primary flow shape: keeping
  OTP verification and referral validation as distinct steps matches the
  existing, already-designed UI flow (`authentication_otp_verification`,
  `authentication_referral_code` screens) and keeps each server-side check
  independently testable and independently rate-limitable.

## Consequences

- The backend's entire footprint is small enough to reason about and audit
  as a unit — mobile-number records, OTP delivery/verification state,
  referral relationships, and session records, nothing else.
- Every one of these five operations must be individually rate-limited and
  abuse-resistant server-side (`authentication-otp-architecture.md`
  §"Rate limiting"/"Abuse prevention") — the client's role throughout is
  strictly "submit a request, display the result."
- A mobile number already associated with an account must be rejected at
  registration time by a server-side uniqueness constraint, not a
  client-side check.

## Open items (not resolved by this ADR)

- **[PRODUCT OWNER DECISION REQUIRED]** Referral reuse policy — whether a
  single referral code can be used by more than one new registrant, or is
  single-use. `/docs/01-product-requirements.md` and
  `/docs/02-user-stories.md` REF stories carry this as open; this ADR does
  not resolve it, only requires that whatever policy is chosen is enforced
  server-side.
- **[OPEN-ARCH]** Exact OTP expiry window and attempt-limit values
  (currently illustrative: 5 minutes, 5 attempts) — pending project-owner
  confirmation.
- **[OPEN-ARCH]** Exact rate-limiting thresholds per number/IP/referral
  code.
- OTP/SMS **provider selection** is a separate, already-tracked decision —
  see `ADR-003-otp-provider-deferred.md`. This ADR's provider-agnostic
  interface requirement (the backend sends an OTP and receives a delivery
  result through a swappable interface) still applies regardless of which
  provider is eventually chosen.

## Security implications

This ADR is the primary defense against the account/referral surface
becoming a bigger attack surface than it needs to be — by keeping it
narrow and explicit, `/docs/security/threat-model.md`'s "Non-goals"
section (no server-side business-data exfiltration surface exists,
because no server-side business data exists) remains true by construction,
not by policy alone.

## Performance implications

None beyond standard web-service latency/throughput considerations for a
small, infrequently-called API surface (registration and login are
low-frequency actions relative to the app's offline business-data usage).

## Status

**CONFIRMED** for the boundary shape and the five-operation online
surface. Individual parameters within it (referral reuse policy, OTP
timing values, rate-limit thresholds, provider selection) remain open, as
listed above.
