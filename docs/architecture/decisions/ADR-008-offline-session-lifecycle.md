# ADR-008 — Offline Session Lifecycle

Status: **CONFIRMED** (policy) with **[OPEN-ARCH]** re-validation cadence/
mechanism left open. See
`/docs/security/authentication-otp-architecture.md`'s session-lifecycle
section and `/docs/security/threat-model.md` for the full analysis; this
ADR records the decision in the standard ADR shape.
Date: 2026-08-08

## Context

An earlier draft of the session-lifecycle analysis treated "purely local
sessions" and "background re-validation" as competing options in tension
with offline-first purity. That framing was corrected during Phase 3
review: it is not actually a trade-off once two categories of event are
kept strictly separate. This ADR exists to lock that correction in as a
formal decision, since it is the single rule most likely to be gotten
wrong by an implementer reaching for a generic "log out on any auth
error" pattern.

## Decision

Two event categories, never conflated:

| Event | Category | Effect on local session |
|---|---|---|
| No connectivity | **NETWORK FAILURE** | Session remains valid and usable. No re-validation attempt is made. |
| Request timeout | **NETWORK FAILURE** | Same — a timeout carries no information about session validity. |
| Server unreachable/unavailable (5xx, connection refused, DNS failure) | **NETWORK FAILURE** | Same — "unreachable" means unknown, and unknown must never be treated as revoked. |
| Server reachable, responds "session invalid/expired/revoked" | **AUTHENTICATION FAILURE** | The defined security response applies: session ends, user must re-authenticate. This is the *only* row that ends a session. |

Background re-validation MAY run opportunistically when connectivity
happens to be available, but its absence, failure, or inability to
complete is always interpreted as "no new information" — never as a
reason to log the user out, block local data, or degrade any
OFFLINE-classified functionality (which is all business-data
functionality, per `/docs/01-product-requirements.md` §4a).

## Alternatives considered

- **Fail-closed on any re-validation error** (log out whenever a
  background check doesn't succeed, regardless of why) — rejected: this is
  exactly the anti-pattern `threat-model.md` names as
  "availability-masquerading-as-security" — it would turn ordinary
  connectivity gaps into forced logouts, directly violating the
  local-first requirement that an already-authenticated user must be able
  to continue using the app offline.
- **No background re-validation at all (purely local sessions,
  revalidated only at explicit user action)** — not rejected, but not
  selected as the sole mechanism either: this remains a valid degenerate
  case of the policy above (if re-validation never runs, the outcome table
  simply never produces an AUTHENTICATION FAILURE row until the user
  explicitly logs in again) and could be the actual implementation choice
  depending on cadence decisions still open — the policy in this ADR holds
  either way.
- **Requiring connectivity to use the app at all** (so revocation is
  always enforceable) — explicitly ruled out by Phase 0 Decision 4.

## Consequences

- Any implementation of a background/opportunistic re-validation check
  must route its result through the two-category interpretation above,
  not through a generic HTTP-error-handling path that might treat a 5xx or
  timeout the same as a 401.
- A stolen or compromised device kept offline (or on a network the
  attacker controls to block the re-validation call) retains local session
  access for as long as it stays offline — an accepted, named consequence
  of the local-first model, not a bug to fix later. Mitigations that
  reduce but do not eliminate this (shorter re-validation intervals when
  online, an app-level local unlock/PIN gate) remain open,
  UX-dependent items.

## Security implications

This is itself a security decision, not just a UX one: it prevents a
network-availability problem from being misclassified as a security event
(which would create a denial-of-service vector — an attacker or flaky
network forcing legitimate users out of their own offline data) while
still enforcing an explicit, server-confirmed revocation immediately once
it's known.

## Performance implications

None directly — re-validation, when it runs, is a lightweight background
check, not on the critical path of any OFFLINE business-data operation.

## Status

**CONFIRMED** for the policy (the two-category distinction and its
effects). **[OPEN-ARCH]**: when and how often the opportunistic
re-validation check runs (on app foreground, on a timer, on specific
sensitive actions), and the exact local session representation used —
implementation-mechanics questions that do not change the policy above no
matter how they're answered.
