# Authentication / OTP Architecture Analysis

Status: DRAFT — Phase 3 architectural analysis. Does not select an OTP
provider (see ADR-003). Builds on Phase 1 §5 and Phase 2's AUTH/REF stories.
Date: 2026-08-08

## Scope reminder

**[CONFIRMED]** This is the entire online surface of the application (Phase 0
Decision 4, §4a of the requirements doc): registration, OTP send/verification,
referral validation, recording the registered phone/referral relationship,
and establishing a new login session. Everything analyzed here is a small,
bounded, heavily scrutinized part of the system precisely because it's the
only part that talks to a network.

## Registration flow (conceptual)

```
User enters mobile number
        │
        ▼
Backend: rate-limit check on this number/IP → send OTP via provider
 (provider interface, ADR-003 — not selected)
        │
        ▼
User enters OTP
        │
        ▼
Backend: verify OTP (single-use, expiring, attempt-limited)
        │
        ▼
User enters referral code
        │
        ▼
Backend: validate referral code server-side
 (existence, not self-referral, reuse-policy check — Phase 1 §5.1)
        │
        ▼
Backend: create account record, generate unique referral code for the
 new user, record referral relationship
        │
        ▼
Backend: issue session credential
        │
        ▼
Device: store session credential in secure local storage;
 initialize local database for this user
```

Every arrow above that crosses from device to backend is the *only* kind of
network call this product makes outside of this flow. Everything after
"issue session credential" happens locally from then on (OFFLINE per §4a),
until the next time a *new* session must be established.

## OTP lifecycle

- **[CONFIRMED, Phase 1 §5.2]** Single-use, time-limited codes.
- **[ASSUMPTION carried from Phase 1, not re-decided here]** Illustrative
  5-minute expiry, 5 verification attempts per issued code — still
  illustrative, still pending project-owner confirmation, not hardened into a
  decision by this document.
- **Architectural requirement**: OTP state (which code was issued, when, how
  many attempts remain) must live entirely server-side — the client must
  never be trusted to self-report "I verified correctly," directly parallel
  to the referral server-side-validation requirement.

## Rate limiting

- **[CONFIRMED requirement, Phase 1 §5.1/§5.2/§18]** Applies at multiple
  layers:
  - Per mobile number: limit OTP requests over a time window (prevents
    SMS-bombing/cost abuse).
  - Per mobile number: limit OTP verification attempts (prevents brute-force
    guessing of a 4-6 digit code).
  - Per referral code: limit how many registration attempts can be made
    against a single code in a time window (prevents scripted mass
    registration off one leaked code, Phase 1 §5.1).
  - Per IP/device where feasible: a coarser layer to slow down distributed
    abuse attempts, without being so aggressive it blocks legitimate shared-
    network users (e.g. multiple agents at the same office Wi-Fi).
- **[OPEN-ARCH]** Exact thresholds are implementation-phase tuning, not
  architecturally fixed here.

## Retry limits

- Distinct from rate limiting: after N consecutive failed OTP verification
  attempts for a given issued code, that code should be invalidated outright
  (forcing a new OTP request) rather than allowing indefinite retries against
  the same code within its time window — this bounds the total guess space
  per code, independent of how the time-window rate limit is tuned.

## Expiration

- OTP expiration is enforced server-side and checked at verification time —
  an expired code must be rejected even if it's otherwise correct, with an
  error distinguishable from "wrong code" so the user knows to request a new
  one rather than re-typing the same one.
- Session expiration (§ below) is a separate concept on a much longer
  timescale.

## Session lifecycle

- **[CONFIRMED, Phase 1 §5.3]** A session must be able to expire and be
  revoked (logout, suspected compromise).
- **Architectural shape**: session establishment is the *only* other
  ONLINE_REQUIRED moment beyond initial registration (a returning user
  logging in again, e.g. after logout or on a new device, per AUTH-02).
  Once established, the session credential is used purely locally to gate
  access to the local database.

### The critical local-first rule: NETWORK FAILURE ≠ AUTHENTICATION FAILURE

**[CONFIRMED — critical rule, corrected after Phase 3 review]** A prior draft
of this document treated "purely local sessions" and "background
re-validation" as two competing options in tension with offline-first purity.
That framing was wrong: it's not actually a trade-off if the two failure
modes below are kept strictly separate, which is now a hard architectural
rule, not a preference.

- **An already-authenticated user MUST be able to continue using the core
  application when the internet is unavailable.** This is non-negotiable and
  follows directly from Decision 4 — it is not weighed against anything else
  below.
- **Background session re-validation MAY be used when connectivity happens to
  be available**, but its outcome must be interpreted according to a strict
  distinction between two categories of result:

  | Event | Interpretation | Effect on local session |
  |---|---|---|
  | No connectivity at all | **NETWORK FAILURE** | Session remains valid and usable. App continues fully offline. No re-validation attempt is even made. |
  | Request times out | **NETWORK FAILURE** | Same as above — a timeout carries no information about session validity, only that the check itself didn't complete. |
  | Server unreachable / temporarily unavailable (5xx, connection refused, DNS failure, etc.) | **NETWORK FAILURE** | Same as above — an unreachable server cannot be assumed to mean "revoked"; it means "unknown," and unknown must never be treated as revoked. |
  | Server reachable and responds "this session is invalid / expired / revoked" | **AUTHENTICATION FAILURE** | The defined security response applies: the local session is ended and the user must re-authenticate (AUTH-02). This is the *only* row in this table that ends a session. |

- **[BUSINESS RULE, non-negotiable]**: failed network access must NOT log the
  user out. Timeout must NOT log the user out. Temporary server
  unavailability must NOT log the user out. Offline state must NOT block any
  core application functionality (per §4a: all business-data workflows are
  OFFLINE regardless of session-revalidation state). The local authenticated
  session remains usable according to the security/session policy defined
  here — anything short of an explicit, successfully-delivered
  "session is invalid" response from the server is treated as "no new
  information," not as a revocation signal.
- **What remains genuinely open** (an implementation-mechanics question, not
  the policy above, which is now fixed): *when* and *how often* the app
  opportunistically attempts a background re-validation check while online
  (e.g. on app foreground, on a timer, on specific sensitive actions), and
  what specific local session representation (token, expiry metadata, etc.)
  it uses. **[OPEN-ARCH]** — this is a cadence/mechanism detail for
  implementation, not a security-policy question, since the policy above
  applies identically no matter how often the check runs.

### Remaining security trade-off (explicitly identified, not resolved here)

Because a revocation can only take effect once the device happens to be
online and successfully reach the server, **a stolen or compromised device
that is kept offline (or on a network the attacker controls to block the
re-validation call) retains local access to that session for as long as it
stays offline.** This is an inherent property of any local-first,
offline-capable system — the alternative (requiring connectivity to use the
app at all, so revocation is always enforceable) is explicitly ruled out by
Decision 4. This trade-off is not resolved by this document; it is named so
the project owner is not surprised by it later. Mitigations that reduce (but
do not eliminate) its impact, without violating the offline-first rule above,
include: shorter opportunistic re-validation intervals when online (a
cadence detail, not a policy change), and app-level protections like a local
device unlock/PIN gate on the app itself — **[OPEN-ARCH, UX-dependent]**, not
designed here.

## Referral validation

- **[CONFIRMED, Phase 1 §5.1]** Server-side only; must resist self-referral,
  invalid codes, and (per whichever reuse policy is eventually confirmed)
  reuse. Architecturally this lives entirely in the backend's registration
  handler — the client sends a candidate code and receives a validated/
  rejected result; the client never independently determines validity.

## Duplicate phone prevention

- **[BUSINESS RULE, implied by "recording the registered mobile number" being
  part of the online surface]** A mobile number already associated with an
  account must not be able to register a second, separate account — the
  backend must check this at registration time (already covered narratively
  by AUTH-01's "mobile number already registered → directs to login" error
  case) and enforce it with a uniqueness constraint on the backend's user
  record for that number, not merely a client-side check.

## Abuse prevention (consolidated)

- Combines rate limiting, retry limits, referral-code abuse prevention (Phase
  1 §5.1), and duplicate-phone prevention above into one backend surface,
  all enforced server-side. The client's role in all of this is strictly
  "submit a request, display the result" — never "decide whether this is
  allowed."

## Offline behavior after authentication

- **[CONFIRMED, §4a]** Once a session is established, the app's use requires
  no connectivity — this includes every business-data workflow. The only
  thing that becomes unavailable offline post-authentication is establishing
  a brand-new session (e.g. after an explicit logout, or on a new device),
  which is expected and already handled gracefully per AUTH-06.
- **[CONFIRMED — restated from the Session Lifecycle section above]**
  Background re-validation's explicit design constraint is that it must never
  block or degrade offline use, and must never treat a NETWORK FAILURE as a
  reason to log the user out — a failed, timed-out, or skipped background
  re-validation check (because the device is offline, or the server is
  temporarily unreachable) is silently deferred, full stop, not surfaced as
  an error and never a forced logout. Only an explicit AUTHENTICATION FAILURE
  response from a reachable server triggers the defined security response.

## Risks

- The remaining trade-off named in the Session Lifecycle section (a stolen
  device kept offline retains local session access until it reconnects) is
  inherent to any offline-first system and is not resolved by this document —
  named explicitly so it is a known, accepted property rather than a
  surprise.
- The re-validation cadence/mechanism (when/how often the opportunistic check
  runs) remains an open implementation detail — unlike the policy governing
  its outcome, which is now fixed (NETWORK FAILURE vs. AUTHENTICATION
  FAILURE, above).
- OTP/referral abuse-prevention thresholds are currently only qualitatively
  specified — real values need tuning against expected usage patterns once
  those are better understood, and against whatever the eventual OTP
  provider's own capabilities are (ADR-003).

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Background re-validation cadence/mechanism (the policy governing its
  outcome — NETWORK FAILURE vs. AUTHENTICATION FAILURE — is now confirmed,
  not open).
- Exact OTP expiry/attempt-limit values (currently illustrative only).
- Exact rate-limiting thresholds.
- OTP provider selection (ADR-003, explicitly deferred).
- Local device unlock/PIN gate as a mitigation for the offline-stolen-device
  trade-off — open and UX-dependent.
