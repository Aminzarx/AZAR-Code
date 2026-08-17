# ADR-003 — OTP/SMS Provider Selection: Explicitly Deferred

Status: **DEFERRED by instruction.** This ADR records that no OTP/SMS provider
is selected in Phase 3, and captures the criteria a later decision should be
evaluated against, so the deferral is documented rather than silent.
Date: 2026-08-08

## Context

Phase 0 Decision 2 and every subsequent phase have kept OTP/SMS provider
selection open. Phase 3's instructions explicitly repeat: do not select an
OTP provider yet. This ADR exists so "provider TBD" is a recorded, reasoned
decision rather than an accidental gap in the documentation set.

## Decision

**No provider is selected.** The auth/referral backend service
(`/docs/architecture/00-architecture-overview.md`) is designed with a
provider-agnostic interface: something in the backend sends an OTP to a
mobile number and receives a delivery result; the specific vendor behind that
call is swappable.

## Criteria for the eventual decision (for whoever makes it later)

- **Delivery reliability and coverage** in the regions this product's users
  actually operate in — real-estate agents/brokers in a specific
  market/country, which this document does not know and should not guess.
- **Cost model** (per-message pricing, minimum commitments) relative to
  expected registration/login volume.
- **Delivery speed**, since OTP expiry windows (Phase 1 §5.2's illustrative
  5-minute default) are tight enough that slow delivery directly causes user-
  visible failures.
- **Fraud/abuse tooling** the provider offers natively (e.g. built-in rate
  limiting, number reputation) that could reduce how much abuse-prevention
  logic (Phase 1 §5.1, §18) the backend must implement itself.
- **Compliance** requirements relevant to SMS delivery and phone-number data
  handling in the target market(s).

## Consequences

- The backend's OTP-sending code path must be written behind an interface
  (e.g. a single "send OTP" function/service boundary) from the start of
  implementation, specifically so provider selection later is a
  configuration/integration change, not a rearchitecture.
- Local testing/development environments will need a stub/mock OTP path
  (e.g. a fixed test code in non-production builds) — this is an
  implementation-phase detail, noted here only so it isn't forgotten, not
  designed in this document.

## Status

**Deferred, not decided.** Revisit when the project owner is ready to select a
provider — likely alongside or after `/docs/security/authentication-otp-architecture.md`'s
flow is implemented against a stub.
