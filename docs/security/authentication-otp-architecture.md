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
  access to the local database — **[OPEN-ARCH]** whether continued app use
  requires periodically re-validating the session with the backend (e.g. a
  background token refresh) or is purely local until an explicit new-session
  event is a real architectural fork:
  - **Option A — purely local after establishment**: once logged in, the
    session credential (and the local data it unlocks) remains valid
    indefinitely on-device until explicit logout, with no further network
    contact required. Maximizes offline-first purity (Decision 4) but means
    "revoke this session remotely" (e.g. a stolen device scenario) has no
    teeth unless the device later happens to come online and check.
  - **Option B — periodic background re-validation when online**: the app
    opportunistically re-checks session validity with the backend when
    connectivity happens to be available, without *requiring* it to keep
    working offline. Preserves offline-first (still fully functional with
    zero connectivity, per Decision 4) while giving remote revocation some
    practical effect for a user who does eventually reconnect.
  - **[PROPOSED]** Option B is recommended as more consistent with the
    security requirement that sessions "can be revoked" (Phase 1 §18)
    actually meaning something, while still fully satisfying "the app remains
    functional offline" — the check is opportunistic, never blocking. Not
    finalized; a genuine trade-off the project owner may want to weigh in on
    given it's the one place session security and pure-offline purity are in
    tension.

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
- If session-lifecycle Option B (background re-validation) is adopted, its
  explicit design constraint is that it must never block or degrade offline
  use — a failed or skipped background re-validation check (because the
  device is offline) must be silently deferred, not surfaced as an error or a
  forced logout.

## Risks

- Session-lifecycle Option A vs. B (above) is the main open architectural
  tension in this document and should be resolved before implementation,
  since it affects how "revoked session" is even representable.
- OTP/referral abuse-prevention thresholds are currently only qualitatively
  specified — real values need tuning against expected usage patterns once
  those are better understood, and against whatever the eventual OTP
  provider's own capabilities are (ADR-003).

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Session-lifecycle Option A vs. B.
- Exact OTP expiry/attempt-limit values (currently illustrative only).
- Exact rate-limiting thresholds.
- OTP provider selection (ADR-003, explicitly deferred).
