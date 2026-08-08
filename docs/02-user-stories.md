# 02 — User Stories

Status: DRAFT — Phase 2, amended. Derived directly from
`/docs/01-product-requirements.md`, including its local-first/offline-first
amendment (Phase 0 Decision 4). No application code has been written; no
implementation detail is invented here beyond what Phase 1 already established.
Where a story would require an implementation detail Phase 1 left open, the
story says so explicitly instead of inventing one.
Date: 2026-08-08 (amended)

## Conventions

- **ID prefixes**: AUTH (authentication), REF (referral), PROF (profile), OWN
  (owner files), APP (applicant files), SRCH (search), FILT (filtering), MATCH
  (matching), MEXP (match explanation), CONT (contracts), REM (reminders),
  NOTIF (notifications), BKP (backup), RST (restore), IE (import/export), OFF
  (offline behavior), SYNC (network-dependent-operation behavior — see note
  below), ERR (errors), SEC (security-sensitive workflows).
- **Priority**: P0 = required for a usable v1 (blocks core workflows), P1 =
  required for a complete v1, P2 = valuable, can follow v1.
- **Connectivity tag**: every story states **[OFFLINE]**, **[ONLINE_REQUIRED]**,
  or **[ONLINE_OPTIONAL]** next to its ID, per the classification in
  `/docs/01-product-requirements.md` §4a. This is a hard constraint, not a
  suggestion — an OFFLINE story's acceptance criteria may never assume
  connectivity, and vice versa.
- Every acceptance criterion is written as an observable product behavior, not
  an implementation instruction.
- Stories referencing an **[OPEN-ARCH]** item state the open question inline
  rather than assuming an answer.
- **Note on the SYNC prefix**: prior to Phase 0 Decision 4
  (local-first/offline-first), this prefix covered automatic background
  synchronization of business data with a server. That premise no longer
  applies — business data has no required server counterpart (§4a). The SYNC
  stories below now cover the narrower, still-real concern of retrying the
  small account/referral online surface when connectivity returns, plus the
  explicit, user-controlled (never automatic) restore-on-another-device flow.

---

## Authentication

### AUTH-01 — Register with mobile number, OTP, and referral code [ONLINE_REQUIRED]
- **Actor**: Prospective user (unauthenticated)
- **Goal**: Create an account to start using the app.
- **Description**: A new user enters their mobile number, receives and enters
  an OTP, and enters a valid referral code, completing registration.
- **Preconditions**: User is not registered; user has a valid referral code
  from an existing user.
- **Main flow**:
  1. User enters mobile number.
  2. System sends an OTP to that number.
  3. User enters the OTP.
  4. System verifies the OTP.
  5. User enters a referral code.
  6. System validates the referral code server-side.
  7. Account is created; user is logged in and lands on the home screen.
- **Alternative flows**:
  - User requests OTP resend (subject to rate limiting).
- **Error/edge cases**:
  - Invalid mobile number format → inline validation error, no OTP sent.
  - OTP expired or incorrect → clear error, option to resend/retry within
    limits.
  - Referral code not found → specific error distinct from "already used" or
    "malformed" (Phase 1 §5.1).
  - Referral code belongs to the same identity as the registering user
    (self-referral) → registration blocked with a clear message.
  - Mobile number already registered → directs to login instead of
    re-registration.
  - **Device is offline at any step of registration** → the step that
    requires connectivity fails immediately with a specific message (e.g.
    "Sending the verification code requires an internet connection") rather
    than hanging, timing out unclearly, or appearing to queue for later
    (Phase 1 §4a/§15; see also AUTH-06).
- **Acceptance criteria**:
  - Registration cannot complete without all three of: verified mobile
    number, verified OTP, valid referral code.
  - Referral code validity is confirmed server-side even if a client check
    also exists.
  - A new unique referral code is generated for the new account automatically.
  - Registration never partially succeeds offline and never presents a
    "pending" registration state — it is entirely blocked until connectivity
    is available (Phase 1 §4a).
- **Priority**: P0

### AUTH-02 — Log in with mobile number and OTP [ONLINE_REQUIRED]
- **Actor**: Returning registered user
- **Goal**: Access their account on this device.
- **Description**: User enters their mobile number and a fresh OTP to start a
  session.
- **Preconditions**: User is already registered.
- **Main flow**: Enter mobile number → receive OTP → enter OTP → session
  starts → land on home screen.
- **Alternative flows**: None beyond OTP resend.
- **Error/edge cases**: Too many failed OTP attempts → temporary lockout with a
  clear cool-down message (Phase 1 §5.3). Device offline when attempting login
  → same graceful-failure behavior as AUTH-01/AUTH-06.
- **Acceptance criteria**: A valid session exists only after successful OTP
  verification; failed attempts are rate-limited and do not reveal whether the
  number is registered beyond what's necessary for a legitimate user.
- **Priority**: P0

### AUTH-03 — Log out [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: End the current session on this device.
- **Description**: User logs out; local data needed for next login remains,
  session access is revoked.
- **Preconditions**: User is logged in.
- **Main flow**: User selects logout → session ends → user returned to login
  screen.
- **Error/edge cases**: Logout while offline still ends the local session
  (does not require connectivity).
- **Acceptance criteria**: After logout, protected screens are not accessible
  without logging in again; locally stored encrypted data is not deleted by
  logout alone (Phase 1 §5.4). Logout itself never requires connectivity
  (Phase 1 §4a).
- **Priority**: P0

### AUTH-04 — Repeated failed OTP attempts are rate-limited [ONLINE_REQUIRED]
- **Actor**: System / any user (legitimate or attacker)
- **Goal**: Prevent brute-forcing an OTP or account access.
- **Description**: After a defined number of failed OTP verification
  attempts, further attempts for that number are temporarily blocked.
- **Preconditions**: An OTP has been issued for a number.
- **Main flow**: User enters wrong OTP repeatedly → after N attempts, system
  blocks further attempts for a cool-down period and communicates this
  clearly.
- **Error/edge cases**: Legitimate user locked out must have a clear path to
  retry after cool-down or request a new OTP once eligible.
- **Acceptance criteria**: No unlimited-attempt path exists to guess an OTP.
- **Priority**: P0 (security)

### AUTH-05 — Deactivate/delete account [ONLINE_REQUIRED]
- **Actor**: Logged-in user
- **Goal**: Stop using the app and remove/deactivate their account.
- **Description**: User requests account deactivation or deletion from
  profile settings.
- **Preconditions**: User is logged in.
- **Main flow**: User requests deactivation → confirms destructive action →
  account is deactivated/deleted per the retention policy.
- **Error/edge cases**: **[OPEN-ARCH]** exact retention behavior (hard delete
  vs. soft delete/grace period) and effect on referral relationships are not
  yet decided (Phase 1 §5.4, §19.2) — this story cannot specify the exact
  post-deletion state until that is confirmed.
- **Acceptance criteria**: The action requires explicit destructive-operation
  confirmation (Phase 1 §4); once confirmed, the user can no longer log in.
- **Priority**: P1 (blocked on the open retention-policy decision for full
  detail)

### AUTH-06 — Registration or login is blocked while offline, with a clear explanation [ONLINE_REQUIRED]
- **Actor**: Prospective or returning user
- **Goal**: Understand immediately that connectivity is required, instead of
  encountering a confusing hang, timeout, or generic failure.
- **Description**: This story exists specifically to make the network-required
  nature of registration/login a first-class, testable behavior, per Phase 0
  Decision 4's requirement that network-dependent operations "fail gracefully
  and clearly explain what requires connectivity."
- **Preconditions**: Device has no network connectivity.
- **Main flow**: User opens the app (unauthenticated) and attempts to register
  or log in → the app detects no connectivity before or immediately upon
  attempting the network call → a specific message is shown (e.g. "Registering
  and logging in require an internet connection — please reconnect and try
  again"), with a retry action once connectivity is expected to be back.
- **Alternative flows**: Connectivity drops mid-flow (e.g. after OTP is sent
  but before verification completes) → the specific step that failed is
  identified, and the user is not forced to restart the entire flow from
  scratch if avoidable (e.g. a still-valid, already-sent OTP can still be
  entered once connectivity returns, subject to its normal expiry).
- **Error/edge cases**: The message must not be confused with an
  invalid-mobile-number or invalid-OTP error — connectivity failure is a
  distinct, clearly labeled case (Phase 1 §4a, §15).
- **Acceptance criteria**: No registration/login attempt while offline ever
  appears to succeed, hang indefinitely, or produce an ambiguous error; already
  -authenticated users on this device are entirely unaffected, since continued
  use of an existing session is OFFLINE (Phase 1 §5.3).
- **Priority**: P0

---

## Referral

### REF-01 — View and share own referral code [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Share their referral code with someone they want to invite.
- **Description**: User views their unique referral code on their profile and
  shares it via any available device sharing mechanism.
- **Preconditions**: User is registered (every user has exactly one code).
- **Main flow**: User opens profile → sees referral code → shares it.
- **Acceptance criteria**: The code shown is unique to this user and was
  system-generated, never user-chosen (Phase 1 §4).
- **Priority**: P1

### REF-02 — View referral relationship and referred-users count [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See who referred them and how many people they've referred.
- **Description**: Profile shows the referrer (read-only) and a count of
  users who registered using this user's code.
- **Preconditions**: User is registered.
- **Main flow**: User opens profile → sees "referred by" and "referrals made"
  count.
- **Error/edge cases**: Referred users' private details are not exposed beyond
  confirming the relationship exists (Phase 1 §6).
- **Acceptance criteria**: Referrer field is not editable by the user.
- **Priority**: P2

### REF-03 — Referral code rejected as invalid [ONLINE_REQUIRED]
- **Actor**: Prospective user
- **Goal**: Attempt registration with a code that doesn't exist.
- **Description**: Covered as an error branch of AUTH-01, listed separately
  because it is explicitly required by PRODUCT.md as a distinct prevention
  case.
- **Preconditions**: Registration in progress.
- **Main flow**: User enters a non-existent code → system rejects with a
  specific, non-ambiguous error.
- **Acceptance criteria**: Client-only validation is not sufficient; the
  server independently confirms the code is invalid (Phase 1 §5.1).
- **Priority**: P0 (security)

### REF-04 — Self-referral is blocked [ONLINE_REQUIRED]
- **Actor**: Prospective user
- **Goal**: Attempt to register using their own referral code (directly, or via
  an alternate number they control that maps back to the same identity signal).
- **Preconditions**: User already has an account and its referral code.
- **Main flow**: User enters their own code during a new registration attempt
  → system blocks it.
- **Acceptance criteria**: Registration cannot succeed using a code the system
  determines belongs to the same registering identity (Phase 1 §5.1;
  **[OPEN-ARCH]** exact identity-matching signal is a Phase 3 decision).
- **Priority**: P0 (security)

### REF-05 — Referral code reuse policy enforcement [ONLINE_REQUIRED]
- **Actor**: Prospective user / System
- **Goal**: Attempt to register using a code that has already been used.
- **Description**: **[OPEN-ARCH]** Whether reuse is permitted at all is an
  open product decision (Phase 1 §19.2). This story documents the two possible
  outcomes so Phase 3 can implement whichever is chosen without a missing
  story.
- **Preconditions**: A referral code has previously been used at least once.
- **Main flow (if single-use policy chosen)**: Second use is rejected with a
  clear "already used" error.
- **Main flow (if reusable policy chosen)**: Second use succeeds, subject to
  the same abuse-prevention limits as any other registration.
- **Acceptance criteria**: Whichever policy is confirmed, the behavior is
  consistent and clearly communicated to the user attempting reuse.
- **Priority**: P1 — blocked on product decision before final acceptance
  criteria can be locked.

### REF-06 — Referral code validation requires connectivity [ONLINE_REQUIRED]
- **Actor**: Prospective user
- **Goal**: Understand that entering a referral code during registration
  cannot be confirmed while offline.
- **Description**: Referral validation is explicitly server-side (Phase 0
  Decision 2; Phase 1 §5.1) and is part of the account/referral online surface
  (§4a) — it is called out as its own story because it's easy to mistakenly
  assume a referral code's *format* could be checked locally and treated as
  "validated," which would violate the server-side validation requirement.
- **Preconditions**: Device is offline; user has entered mobile number and
  verified OTP up through the referral-code step of AUTH-01 (unlikely in
  practice since OTP itself is also ONLINE_REQUIRED, but this story isolates
  the referral-check dependency specifically) or attempts to check a code's
  validity before starting the rest of registration.
- **Main flow**: User enters a referral code while offline → app does not
  claim the code is valid based on format alone → clear message that referral
  validation requires connectivity → user retries once online.
- **Error/edge cases**: A locally cached "looks like a valid format" check (if
  one exists for UX purposes, e.g. length/character-set validation) must never
  be presented to the user as equivalent to "this code is valid" — only the
  server-confirmed result may say that (Phase 1 §5.1's explicit
  client-side-only-validation prohibition).
- **Acceptance criteria**: No referral code is ever treated as accepted without
  a server round-trip, regardless of how confident a local format check is.
- **Priority**: P0 (security — directly enforces the server-side validation
  requirement)

---

## Profile

### PROF-01 — Edit profile information [OFFLINE / ONLINE_REQUIRED for mobile-number changes]
- **Actor**: Logged-in user
- **Goal**: Keep their profile information current.
- **Description**: User edits editable profile fields (e.g. name).
- **Preconditions**: User is logged in.
- **Main flow**: Open profile → edit field → save.
- **Error/edge cases**: Attempting to edit mobile number requires
  re-verification via OTP on the new number before it takes effect (Phase 1
  §6).
- **Acceptance criteria**: Changes save without requiring navigation away from
  the profile screen (minimal friction, Phase 1 §16).
- **Priority**: P1

### PROF-02 — Set notification preferences [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Control which notifications they receive and how.
- **Description**: User toggles notification categories/channels in settings.
- **Preconditions**: User is logged in.
- **Main flow**: Open settings → adjust notification preferences → changes
  apply immediately.
- **Acceptance criteria**: Preferences persist across sessions and are
  respected by the notification system (Phase 1 §13).
- **Priority**: P1

### PROF-03 — Set backup preferences [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Control automatic backup behavior.
- **Description**: User enables/disables automatic backup and sets frequency,
  from profile settings.
- **Preconditions**: User is logged in.
- **Acceptance criteria**: Preference change affects future automatic backups
  without requiring a manual backup to apply it (Phase 1 §6, §14).
- **Priority**: P1

---

## Owner Files

### OWN-01 — Create an owner/property file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Record a new property to manage and match against.
- **Description**: User fills structured fields (type, transaction type,
  location, area, bedrooms, price, amenities, etc.) plus optional free-form
  and internal notes.
- **Preconditions**: User is logged in.
- **Main flow**: Start new owner file → enter structured fields using
  smart-default/chip-based inputs where enumerable → save.
- **Alternative flows**: Save as draft/incomplete and resume later (autosave,
  Phase 1 §16).
- **Error/edge cases**: Required structured fields missing → inline
  validation, save is still possible as a draft rather than losing entered
  data.
- **Acceptance criteria**: Structured fields are stored separately from
  free-form/internal notes (Phase 1 §7); the file is immediately searchable
  and eligible for matching once saved.
- **Priority**: P0

### OWN-02 — Edit an owner file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Update a property's details as they change.
- **Preconditions**: Owner file exists.
- **Main flow**: Open file → edit fields → save.
- **Acceptance criteria**: Edits are reflected immediately in search and
  future match runs.
- **Priority**: P0

### OWN-03 — View an owner file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See a property's full detail, linked contracts, and current match
  candidates.
- **Preconditions**: Owner file exists.
- **Main flow**: Open file from a list or search result → view detail, notes,
  linked contract(s), and top applicant matches.
- **Error/edge cases**: No current matches → explicit empty state, not a blank
  screen (Phase 1 §16).
- **Acceptance criteria**: Detail view clearly separates structured data from
  notes.
- **Priority**: P0

### OWN-04 — Archive and restore an owner file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Remove a property from active search/matching without deleting it
  (e.g. sold, temporarily off-market).
- **Preconditions**: Owner file exists and is active.
- **Main flow**: Select archive action → file removed from active lists and
  matching → can be found via an "archived" filter and restored.
- **Acceptance criteria**: Archived files are excluded from default
  search/filter/matching results but remain fully recoverable.
- **Priority**: P1

### OWN-05 — Delete an owner file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Permanently remove a property record.
- **Preconditions**: Owner file exists.
- **Main flow**: Select delete → confirmation dialog states what will be
  affected (e.g. linked contracts/history) → confirm → file removed.
- **Error/edge cases**: File has an active linked contract → warning shown
  before allowing deletion, since deleting may orphan contract history (Phase
  1 §7, §11).
- **Acceptance criteria**: Deletion always requires explicit confirmation
  (Phase 1 §4); accidental single-tap deletion is not possible.
- **Priority**: P1

---

## Applicant Files

### APP-01 — Create an applicant/requirement file with prioritized criteria [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Record an applicant's needs as structured, matchable criteria.
- **Description**: User enters structured criteria and, for each relevant
  field, sets a priority (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE), plus
  restrictions/exclusions, preferences, and notes.
- **Preconditions**: User is logged in.
- **Main flow**: Start new applicant file → enter structured criteria → set
  priority per criterion using a simple, low-friction control (e.g. chips) →
  add restrictions/exclusions if any → save.
- **Alternative flows**: Autosave draft (Phase 1 §16).
- **Error/edge cases**: **Worked example (Phase 1 §8.1)**: user marks `pool =
  MUST_HAVE` and sets `price`, `area`, `bedrooms` to `IGNORE` — the file must
  save this exact structured state, not a free-text note approximating it.
- **Acceptance criteria**: Every structured criterion has an explicit priority
  value (defaulting sensibly, e.g. to IMPORTANT or PREFERRED, never silently
  undefined); IGNORE and MUST_HAVE are both fully representable per field.
- **Priority**: P0

### APP-02 — Edit an applicant file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Update an applicant's requirements as they change or clarify.
- **Preconditions**: Applicant file exists.
- **Main flow**: Open file → edit criteria/priorities/restrictions → save.
- **Acceptance criteria**: Priority changes take effect on the next match run
  without requiring the file to be recreated.
- **Priority**: P0

### APP-03 — View an applicant file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See an applicant's full requirement detail and current property
  matches.
- **Preconditions**: Applicant file exists.
- **Acceptance criteria**: Priority levels are visibly distinguishable per
  criterion (not just stored, but shown) so the agent can confirm the
  structured intent at a glance.
- **Priority**: P0

### APP-04 — Archive, restore, and delete an applicant file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Same lifecycle as OWN-04/OWN-05, applied to applicant files, for a
  consistent experience across both file types (Phase 1 §8).
- **Preconditions**: Applicant file exists.
- **Acceptance criteria**: Behavior (archiving reversibility, deletion
  confirmation) is consistent with owner files.
- **Priority**: P1

### APP-05 — (Optional) Convert natural-language input into structured
  requirements for review [ONLINE_OPTIONAL]
- **Actor**: Logged-in user
- **Goal**: Describe an applicant's needs in free text and have it proposed as
  structured criteria, without bypassing manual control.
- **Description**: This story exists only to document the boundary Phase 1
  §9 requires: **if** natural-language input is offered, it must produce a
  structured proposal the user reviews and confirms — it must never write
  directly to matching-relevant fields unconfirmed, and the app must remain
  fully usable (including full matching) if this feature is entirely absent.
  Tagged ONLINE_OPTIONAL rather than OFFLINE because *if* this optional layer
  is ever implemented using a remote AI service, that specific convenience
  step may require connectivity — but per Phase 0 Decisions 3 and 4, this must
  never make the core APP-01 structured entry flow (OFFLINE) depend on it.
- **Preconditions**: Applicant file being created/edited.
- **Main flow**: User types a free-text description → system proposes
  structured field/priority values → user reviews, edits if needed, confirms
  → structured fields are saved (same as APP-01).
- **Error/edge cases**: Proposal is ambiguous or low-confidence → user is
  clearly shown this and prompted to confirm/correct rather than the system
  guessing silently.
- **Acceptance criteria**: No matching-relevant data is set from free text
  without explicit user confirmation; the feature is additive, not required.
- **Priority**: P2 (explicitly optional/enhancement — Phase 0 Decision 3,
  Phase 1 §9)

---

## Search

### SRCH-01 — Global search across files and contracts [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Quickly find any record from one search entry point.
- **Preconditions**: User is logged in; at least some data exists.
- **Main flow**: User types a query → results appear grouped/labeled by type
  (owner file, applicant file, contract) as the user types.
- **Error/edge cases**: No results → explicit empty state with guidance (e.g.
  "try a broader term"), not a blank screen.
- **Acceptance criteria**: Search feels fast (Phase 1 §17) and works offline
  against locally available data, with a clear indicator if results might be
  incomplete due to being offline (Phase 1 §10, §15).
- **Priority**: P0

### SRCH-02 — Contextual search within a list [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Search only within owner files, applicant files, or contracts.
- **Preconditions**: User is viewing a specific list.
- **Main flow**: User searches within the current list → results scoped to
  that type only.
- **Acceptance criteria**: Behaves consistently with global search's speed and
  empty-state handling.
- **Priority**: P1

---

## Filtering

### FILT-01 — Filter owner/applicant files by structured criteria [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Narrow a list using structured fields (price range, bedrooms,
  location, amenities, status).
- **Preconditions**: List contains data.
- **Main flow**: User opens filter controls → selects criteria → list updates.
- **Error/edge cases**: Filter combination yields zero results → explicit
  empty state distinct from "no data exists at all."
- **Acceptance criteria**: Filters use the same structured field vocabulary as
  file creation (Phase 1 §7.1/§8.1), so what a user filters by is exactly what
  they entered.
- **Priority**: P0

### FILT-02 — Save and reuse a filter combination [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Avoid re-entering a frequently used filter.
- **Preconditions**: A filter combination has been applied.
- **Main flow**: User saves the current filter with a name → later selects it
  from a saved-filters list to reapply instantly.
- **Acceptance criteria**: Saved filters persist across sessions.
- **Priority**: P2 — exact scope of what's savable is still open (Phase 1
  §10).

### FILT-03 — Sort a list [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Order results meaningfully (e.g. by price, date added, expiration
  date, match score).
- **Preconditions**: List contains data.
- **Acceptance criteria**: Sort option availability matches what's meaningful
  for that list type (e.g. match score sort only appears in match result
  lists).
- **Priority**: P1

---

## Matching

### MATCH-01 — Run matching from an applicant file (applicant → properties) [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See ranked candidate properties for a given applicant.
- **Preconditions**: Applicant file with structured, prioritized criteria
  exists; at least one owner file exists.
- **Main flow**: Open applicant file → view/run matches → ranked list of
  candidate properties appears, each with a score.
- **Alternative flows**: Re-run matching after editing the applicant's
  criteria.
- **Error/edge cases**: No properties satisfy the applicant's MUST_HAVE
  criteria → explicit empty state explaining that no hard-constraint-passing
  properties exist yet, not a silent empty list.
- **Acceptance criteria**: A property failing any MUST_HAVE criterion never
  appears in the ranked results, regardless of its score elsewhere (Phase 1
  §9); the engine produces this result without any AI API being configured.
- **Priority**: P0

### MATCH-02 — Run matching from an owner file (property → applicants) [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See ranked candidate applicants for a given property (two-way
  matching, Phase 1 §9).
- **Preconditions**: Owner file exists; at least one applicant file exists.
- **Main flow**: Open owner file → view/run matches → ranked list of
  candidate applicants appears.
- **Acceptance criteria**: Uses the same underlying deterministic engine and
  produces the same explainability guarantees as MATCH-01.
- **Priority**: P0

### MATCH-03 — MUST_HAVE criterion excludes otherwise-strong matches [OFFLINE]
- **Actor**: System (behavior verified by the user reviewing results)
- **Goal**: Demonstrate the pool worked example from Phase 1 §8.1/§9.
- **Description**: An applicant sets `pool = MUST_HAVE`, `price = IGNORE`,
  `area = IGNORE`, `bedrooms = IGNORE`. A property with a pool but a price,
  area, and bedroom count far outside what would otherwise be a "typical"
  match still appears as a strong match; a property without a pool, even if
  otherwise ideal on price/area/bedrooms, is excluded entirely.
- **Preconditions**: Applicant file configured exactly as above; at least two
  candidate properties exist — one with a pool and mismatched other
  attributes, one without a pool but well-matched otherwise.
- **Main flow**: Run MATCH-01 for this applicant → verify the pool property
  appears with a high score and the non-pool property does not appear at all.
- **Acceptance criteria**: This exact scenario is representable and produces
  the described outcome without relying on interpreting free text — it is
  driven entirely by the structured priority values (Phase 1 §8.1's worked
  example, PRODUCT.md's explicit example).
- **Priority**: P0 — this is a required regression-test scenario, not just a
  feature demo.

### MATCH-04 — Approximate and range-based criteria [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Match on "around 90 sqm" or "price between X and Y" rather than
  only exact values.
- **Preconditions**: Applicant criteria include a numeric range and/or an
  approximate value.
- **Main flow**: Run matching → properties within the range, or within the
  approximate tolerance, are included and scored accordingly; properties
  outside are excluded or scored lower depending on whether the criterion is
  MUST_HAVE or a softer priority.
- **Acceptance criteria**: Exact, range, and approximate value types are all
  representable per criterion (Phase 1 §9); the exact tolerance/formula is
  intentionally not specified in this story — that belongs to
  `/docs/matching/scoring.md`.
- **Priority**: P0

### MATCH-05 — No AI dependency for core matching [OFFLINE]
- **Actor**: System / QA
- **Goal**: Verify the core matching engine functions with zero AI API
  configured.
- **Preconditions**: No AI API key/service configured in the environment.
- **Main flow**: Run MATCH-01/MATCH-02 with AI entirely disabled/absent →
  results are produced identically to when AI-related optional features (if
  any exist, e.g. APP-05) are present but unused.
- **Acceptance criteria**: No matching functionality degrades, errors, or
  becomes unavailable due to the absence of an AI API (Phase 0 Decision 3,
  Phase 1 §4, §9). This is treated as a release-blocking regression test.
- **Priority**: P0 — non-negotiable per confirmed architectural decision.

---

## Match Explanation

### MEXP-01 — View why a match was recommended [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Understand a match result rather than trust an opaque score.
- **Preconditions**: A match result exists (MATCH-01/MATCH-02).
- **Main flow**: User opens a match result → sees overall score, matching
  criteria, mismatching criteria, ignored criteria, and which requirements
  were critical (MUST_HAVE) — all in one view.
- **Error/edge cases**: A criterion set to IGNORE never appears listed as
  "mismatching," since it was excluded from scoring by design (Phase 1 §9).
- **Acceptance criteria**: No match result can be viewed with only a bare
  score and no explanation (Phase 0 Decision 3's explicit "no mysterious 92%
  match").
- **Priority**: P0

### MEXP-02 — Compare two match results [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Understand why one candidate scored higher than another.
- **Preconditions**: At least two match results exist for the same
  applicant/property.
- **Main flow**: User views both results' explanations side by side or in
  sequence.
- **Acceptance criteria**: The explanation format is consistent enough between
  results to support direct comparison.
- **Priority**: P2

---

## Contracts

### CONT-01 — Create a contract [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Record a signed agreement linking an owner, tenant, and property.
- **Preconditions**: Owner file and property exist; tenant is either an
  existing applicant file or minimally recorded (Phase 1 §11, open
  assumption).
- **Main flow**: Start new contract → select owner, property, tenant → enter
  start and expiration dates → save.
- **Error/edge cases**: Expiration date before start date → validation error,
  save blocked.
- **Acceptance criteria**: Once saved, the contract is immediately eligible
  for the reminder schedule (Phase 1 §12).
- **Priority**: P0

### CONT-02 — Update contract status (renewal/follow-up) [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Reflect renewal negotiation progress.
- **Preconditions**: Contract exists.
- **Main flow**: User updates renewal status and/or follow-up status → change
  is recorded and visible in contract history (not silently overwritten).
- **Acceptance criteria**: Marking a contract "renewed" or "ended" stops
  further expiration reminders against the original expiration date (Phase 1
  §12).
- **Priority**: P0

### CONT-03 — Add notes to a contract [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Record context (e.g. negotiation notes) separate from status
  fields.
- **Preconditions**: Contract exists.
- **Acceptance criteria**: Notes are stored distinctly from structured status
  fields (Phase 1 §11).
- **Priority**: P1

### CONT-04 — View contract history [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: See how a contract's status changed over time.
- **Preconditions**: Contract has had at least one status change.
- **Acceptance criteria**: Prior states remain visible; nothing is silently
  overwritten (Phase 1 §11).
- **Priority**: P1

### CONT-05 — Search contracts [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Find a specific contract (e.g. by property, tenant, status,
  expiration window).
- **Preconditions**: Contracts exist.
- **Acceptance criteria**: Consistent with SRCH-02/FILT-01 behavior.
- **Priority**: P1

---

## Reminders

### REM-01 — Automatic reminder generated on the default schedule [OFFLINE]
- **Actor**: System
- **Goal**: Prompt the user before a contract expires, without manual
  tracking.
- **Preconditions**: Contract exists with a future expiration date.
- **Main flow**: As each of 90/60/30/14/7/3/0 days-before-expiration is
  reached, the system generates a reminder tied to that contract and offset.
- **Acceptance criteria**: All seven default offsets are supported; the
  schedule is configurable per Phase 1 §12 rather than hardcoded as
  unchangeable.
- **Priority**: P0

### REM-02 — Reminder schedule is configurable [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Adjust the default reminder offsets.
- **Preconditions**: User has access to reminder settings.
- **Main flow**: User edits the configured offsets (e.g. removes the 90-day
  reminder) → future reminders follow the updated schedule.
- **Acceptance criteria**: Existing already-fired reminders are unaffected by
  a later schedule change (no retroactive duplicate generation).
- **Priority**: P1

### REM-03 — Duplicate reminders are prevented [OFFLINE]
- **Actor**: System / QA
- **Goal**: Verify a background job running twice for the same day does not
  produce two reminders for the same contract/offset.
- **Preconditions**: A contract has an offset due today; the reminder job is
  triggered twice (e.g. due to a retry or restart).
- **Main flow**: Job runs once → reminder created. Job runs again for the same
  contract/offset → no second reminder is created or delivered.
- **Acceptance criteria**: Idempotency holds regardless of how many times the
  generation process executes for the same (contract, offset) pair (Phase 1
  §4, §12). This is a required regression-test scenario.
- **Priority**: P0 — non-negotiable per confirmed business rule.

### REM-04 — Reminders stop after renewal/end [OFFLINE]
- **Actor**: System
- **Goal**: Avoid nagging about a contract that's already resolved.
- **Preconditions**: Contract marked "renewed" or "ended" (CONT-02) before an
  upcoming offset would fire.
- **Main flow**: Scheduled offset date arrives → no reminder is generated,
  since the contract's status makes it inapplicable.
- **Acceptance criteria**: Matches Phase 1 §12's explicit business rule.
- **Priority**: P0

---

## Notifications

### NOTIF-01 — Receive a local device notification for a reminder [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Be alerted to an expiring contract without opening the app
  proactively, with no connectivity required.
- **Description**: **[Updated after initial Phase 1 documentation — Phase 0
  Decision 4]** Reminder notifications are delivered via the device's local
  notification mechanism, not a push service — the reminder was already
  computed entirely from local contract data (REM-01), so its delivery has no
  reason to depend on a server round-trip either.
- **Preconditions**: A reminder was generated (REM-01); user's notification
  preferences allow this category (PROF-02).
- **Main flow**: Reminder fires (scheduled locally from the contract's
  expiration date) → notification appears in-app and as a local device
  notification, with no connectivity involved at any point.
- **Error/edge cases**: Device is offline (including airplane mode) when the
  reminder is due → the local notification still fires normally, since it
  depends only on the device's own clock and locally stored data, not on
  reaching a server.
- **Acceptance criteria**: A reminder notification fires correctly with zero
  connectivity; notification reflects the user's current preferences at
  delivery time.
- **Priority**: P0

### NOTIF-02 — View notification history and read/unread state [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Review past notifications, not just the newest one.
- **Preconditions**: At least one notification exists.
- **Main flow**: User opens notification center → sees a history list with
  read/unread indicators → opening one marks it read.
- **Acceptance criteria**: History is retained, not just the most recent
  notification (Phase 1 §13).
- **Priority**: P1

### NOTIF-03 — Local notification delivery failure falls back to in-app history [OFFLINE]
- **Actor**: System
- **Goal**: Ensure a reminder isn't lost even if the OS-level local
  notification doesn't visibly fire (e.g. notification permission denied, "Do
  Not Disturb," or the device was off at the scheduled time).
- **Description**: **[Updated after initial Phase 1 documentation]** Since
  reminders no longer depend on push delivery (Phase 0 Decision 4), this story
  no longer concerns retrying a network delivery — it concerns the local
  fallback when the on-device notification itself doesn't reach the user.
- **Preconditions**: A reminder was generated (REM-01) but its local
  notification did not visibly reach the user for an OS-level reason.
- **Main flow**: Reminder is still recorded and visible in the in-app
  notification history (NOTIF-02) regardless of whether the local OS
  notification was seen, so opening the app surfaces it either way.
- **Acceptance criteria**: A user is never solely dependent on catching a
  transient local notification — the in-app history is authoritative and
  always reflects every generated reminder (Phase 1 §13). **[OPEN-ARCH]** exact
  OS-level scheduling/permission-handling mechanism is a Phase 3 detail.
- **Priority**: P1

---

## Backup

### BKP-01 — Manual backup [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Create an encrypted backup on demand.
- **Preconditions**: User is logged in.
- **Main flow**: User triggers manual backup → system produces an encrypted,
  integrity-protected backup file.
- **Acceptance criteria**: Backup is portable (usable for IE-01/RST-01 later)
  and does not expose data as plain readable application data outside the app
  (Phase 1 §14).
- **Priority**: P0

### BKP-02 — Automatic backup per preference [OFFLINE]
- **Actor**: System
- **Goal**: Back up data automatically according to the user's saved
  preference (PROF-03).
- **Preconditions**: Automatic backup is enabled with a chosen frequency.
- **Main flow**: At the configured interval, system produces a backup without
  user action.
- **Acceptance criteria**: Behaves consistently with BKP-01's encryption/
  integrity guarantees; does not block or degrade normal app use while
  running.
- **Priority**: P1

---

## Restore

### RST-01 — Restore from a valid backup [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Recover data from a previously created backup.
- **Preconditions**: A valid backup file is available.
- **Main flow**: User selects restore → provides the backup's key/password →
  system validates integrity and version compatibility → restores data →
  confirms success.
- **Error/edge cases**: See RST-02/RST-03.
- **Acceptance criteria**: Restore always validates the backup (integrity +
  version) before applying it — never applies a backup blindly (Phase 1 §14).
- **Priority**: P0

### RST-02 — Restore fails on incorrect password/key [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Understand why restore failed when the wrong key/password was
  entered.
- **Preconditions**: Backup file exists; user enters an incorrect
  password/key.
- **Main flow**: Restore attempted → decryption fails → user sees a message
  specifically indicating the key/password was wrong (not "file corrupted").
- **Acceptance criteria**: Wrong-key and corrupted-file failures are
  distinguishable to the user (Phase 1 §14) — never conflated.
- **Priority**: P0

### RST-03 — Restore fails on corrupted or tampered backup [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Be protected from restoring damaged or tampered data.
- **Preconditions**: Backup file is corrupted or has failed an integrity
  check.
- **Main flow**: Restore attempted → integrity check fails → restore is
  refused with a clear "backup appears corrupted/invalid" message; existing
  local data is left untouched.
- **Acceptance criteria**: A failed restore never partially applies data or
  silently damages the current local dataset.
- **Priority**: P0

### RST-04 — Restore an incompatible/older-version backup [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Restore a backup created by an older app version.
- **Preconditions**: Backup's version is older/newer than currently supported.
- **Main flow**: System detects a version mismatch → either migrates it
  forward per the compatibility policy or rejects it with a specific reason
  and guidance (Phase 1 §14; **[OPEN-ARCH]** exact policy is a later, dedicated
  decision in `/docs/backup/backup-specification.md`).
- **Acceptance criteria**: The user is never left guessing why restore failed
  for a version-compatibility reason.
- **Priority**: P1

### RST-05 — Restore a backup onto a different device, as an explicit user-controlled operation [OFFLINE]
- **Actor**: Logged-in user (on a new/different device)
- **Goal**: Bring their data onto a new phone (or reinstall) from a
  previously created backup.
- **Description**: **[Added after initial Phase 1 documentation — Phase 0
  Decision 4]** This is the product's entire cross-device story: there is no
  background/automatic sync between devices. Moving to a new device is always
  a deliberate, user-initiated restore from a file the user themself provides
  (via IE-01's export) — not something the app does on its own or silently
  reconciles.
- **Preconditions**: User has a valid, previously exported encrypted backup
  file, accessible on the new device by whatever means the user chose to
  transfer it (cable, file share, a cloud drive they personally picked, etc.
  — outside the app's control, per Phase 1 §14).
- **Main flow**: User installs/opens the app on the new device → chooses
  "restore from backup" → selects the backup file → enters the
  password/key → app validates (RST-01's integrity/version checks) → restores
  data onto this device.
- **Alternative flows**: New device already has some local data (e.g. from a
  prior partial setup) → **[CONFIRMED — FINAL, resolved]** this now follows
  the mandatory safety-backup-then-replace sequence in RST-06 below, rather
  than either blocking indefinitely or overwriting silently; silently,
  invisibly merging the two datasets remains explicitly out of scope (Phase 1
  §15) unless a future product decision requires multi-device sync.
- **Error/edge cases**: Same wrong-key (RST-02) and corrupted/incompatible
  (RST-03/RST-04) failure handling applies identically on a new device.
- **Acceptance criteria**: Restoring on a new device requires no connectivity
  and no server-side account linkage step beyond the normal login on that
  device; the operation is entirely driven by the backup file and the user's
  key/password.
- **Priority**: P0

### RST-06 — Existing local data is protected by a mandatory safety backup before restore replaces it [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Restore a backup onto a device that already has business data on
  it, without risking silent loss of what's currently there.
- **Description**: **[CONFIRMED — FINAL product decision, added after the
  Phase 3/UI correction round]** Restore must never silently overwrite
  existing local business data. This story defines the mandatory sequence,
  matching the design already validated in
  `/design/stitch/stitch_elite_real_estate_crm/restore_existing_data_warning/`:
  Existing Data Detected → Create Safety Backup → Validate Safety Backup →
  Explicit "Restore & Replace" Confirmation → Restore → Verify Restored
  Dataset.
- **Preconditions**: User has selected a valid backup file to restore
  (RST-01) on a device that already has existing owner files, applicant
  files, contracts, or other business data.
- **Main flow**:
  1. App detects existing local business data on the device.
  2. App clearly warns the user that continuing will replace that data.
  3. App creates a safety backup of the device's *current* data.
  4. App validates that safety backup succeeded.
  5. App requires explicit confirmation from the user (e.g. "Restore &
     Replace," never a bare "OK") before proceeding.
  6. Only after both the safety backup is validated and the user has
     confirmed does the app perform the restore.
  7. App verifies the restored dataset before reporting success.
- **Alternative flows**: User cancels at any point before step 6 → no
  modification is made to the existing local data; the device is left
  exactly as it was.
- **Error/edge cases**: The safety backup itself fails to complete
  successfully → the restore does not proceed at all, and the user is told
  why, consistent with RST-01 through RST-04's failure-handling patterns.
- **Acceptance criteria**: There is no code path in which existing local
  business data is deleted or overwritten before both (a) a validated safety
  backup of that data exists and (b) the user has explicitly confirmed the
  replacement. Cancellation at any point prior to the actual restore step
  leaves existing data completely untouched.
- **Priority**: P0 — non-negotiable per confirmed final product decision.

---

## Import / Export

### IE-01 — Export data for transfer to another device [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Move their data to a new phone.
- **Preconditions**: User has data to export (or an existing backup, per
  BKP-01).
- **Main flow**: User exports a backup file → transfers it to the new device
  by any means (file share, cloud drive, cable, etc.) → imports it there
  (RST-01 flow on the new device).
- **Acceptance criteria**: The exported file works identically on a different
  device than it was created on (Phase 1 §14's cross-device requirement).
- **Priority**: P0

### IE-02 — Import fails gracefully on an invalid file [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Attempt to import a file that isn't a valid backup at all (e.g.
  wrong file type selected).
- **Preconditions**: User selects a non-backup file for import.
- **Main flow**: System recognizes the file doesn't match the expected format
  → clear error, no partial import.
- **Acceptance criteria**: Distinguishable from RST-02/RST-03's more specific
  failure messages where the file is a backup but wrong-key/corrupted.
- **Priority**: P1

---

## Offline Behavior

**[Section updated after initial Phase 1 documentation — Phase 0 Decision 4]**
These stories originally framed offline use as a resilience feature layered on
top of an otherwise-connected app ("previously loaded/synced data," changes
"marked as pending sync"). That framing is now corrected: offline is the
application's **normal** operating mode for all business data, not a fallback.

### OFF-01 — Use the app fully with no connectivity at all [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: View, search, and work with their business data with zero
  connectivity, as the normal case rather than an exception.
- **Preconditions**: User has an existing session on the device (established
  per AUTH-01/AUTH-02 while online, at some point in the past); device is now
  offline.
- **Main flow**: User opens the app offline → all locally stored owner files,
  applicant files, contracts, matches, match explanations, reminders, and
  notifications are fully viewable and searchable, exactly as they would be
  online, since there is no cloud counterpart being polled or awaited (Phase 1
  §4a).
- **Acceptance criteria**: No core viewing, search, filtering, or matching
  functionality throws an error, shows a loading spinner waiting on a network
  call, or behaves differently purely because of missing connectivity (Phase 1
  §15). This is the majority-case user story, not an edge case.
- **Priority**: P0

### OFF-02 — Create and edit business data fully offline [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Add or update an owner file, applicant file, contract, or note,
  and run matching, without connectivity — as normal operation.
- **Preconditions**: User has an existing session on the device; device is
  offline.
- **Main flow**: User creates/edits a file, updates a contract, or runs
  matching against local data → change is saved to local storage directly and
  immediately — there is no "pending sync" state for business data, because
  business data has no required remote counterpart to synchronize with (Phase
  0 Decision 4).
- **Error/edge cases**: An action that inherently requires connectivity (mobile
  number registration, OTP verification, referral validation, or establishing
  a brand-new login session — §4a's ONLINE_REQUIRED set) fails clearly and is
  retryable, not silently accepted or queued (see AUTH-06). No other action in
  this product requires connectivity.
- **Acceptance criteria**: Data entered offline is saved as a normal, final,
  local write — never lost, and never shown as "unsynced" or "pending," since
  there is nothing further for it to sync to by default.
- **Priority**: P0

### OFF-03 — Offline state is indicated only where it's actually relevant [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Know when connectivity is unavailable, specifically in the
  moments that matter (attempting an ONLINE_REQUIRED action), without being
  shown a misleading "degraded mode" banner while doing fully-supported
  offline work.
- **Preconditions**: Device is offline.
- **Description**: **[Updated after initial Phase 1 documentation]** Because
  offline is the app's normal mode (§4a), a blanket "you are offline, some
  features may not work" banner shown across the entire app would misrepresent
  the product — nearly everything does work. The offline indicator's job is
  to inform, not to imply degradation.
- **Main flow**: On screens/actions that are OFFLINE per §4a, no offline
  warning is shown (there's nothing to warn about). On screens/actions that
  are ONLINE_REQUIRED (registration, login, referral entry), a specific,
  scoped message appears only when the user reaches that specific action while
  offline (see AUTH-06, REF-06).
- **Acceptance criteria**: An offline user performing only OFFLINE-classified
  workflows never sees a misleading "app is degraded" message; an offline user
  attempting an ONLINE_REQUIRED action always sees a specific, accurate one
  (Phase 1 §4a, §16).
- **Priority**: P1

---

## Network-Dependent Operation Behavior

**[Section renamed and rewritten after initial Phase 1 documentation — Phase 0
Decision 4]** Originally named "Synchronization" and written around automatic
background sync of business data with a server. That premise no longer
applies: there is no cloud counterpart for business data to sync with, so
there is nothing to reconcile, and no conflicts of that kind can occur. What
remains is narrower and still real: retrying the small ONLINE_REQUIRED
account/referral surface, and the explicit, user-controlled restore-on-another
-device flow (already covered by RST-05). The ID prefix SYNC is kept for
continuity with earlier phase artifacts, but its scope has changed.

### SYNC-01 — Retry an ONLINE_REQUIRED action once connectivity returns [ONLINE_REQUIRED]
- **Actor**: Prospective or returning user
- **Goal**: Complete registration, login, or referral validation once
  connectivity is available, after it previously failed due to being offline.
- **Description**: **[Replaces the former "business data auto-sync" story —
  Phase 0 Decision 4]** This story no longer concerns business data at all;
  business data was already saved locally and complete the moment it was
  entered (OFF-02). It concerns only the account/referral operations in §4a
  that could not complete while offline (see AUTH-06, REF-06).
- **Preconditions**: A registration/login/referral-validation attempt
  previously failed or was blocked due to no connectivity; connectivity has
  now returned.
- **Main flow**: User retries the blocked action (manually, via the retry
  affordance shown in AUTH-06/REF-06) → it completes normally now that
  connectivity is available.
- **Acceptance criteria**: No automatic, silent retry of these
  security-sensitive operations happens in the background without user
  awareness — the user retries the action explicitly, consistent with OTP
  codes having their own expiry (Phase 1 §5.2) that a background retry could
  violate.
- **Priority**: P1

### SYNC-02 — Restore-on-another-device is explicit and user-controlled, never automatic [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Understand that moving to a new device never happens silently or
  automatically.
- **Description**: **[Replaces the former "sync conflict" story, which assumed
  automatic multi-device sync — Phase 0 Decision 4]** There is no requirement
  for multi-device cloud synchronization, so there is no automatic conflict to
  resolve. The full cross-device story is RST-05: an explicit, user-initiated
  restore from a manually transferred backup file. This story exists to make
  that absence of automatic behavior an explicit, testable product guarantee,
  not just an implied one.
- **Preconditions**: A user has data on Device A and, separately, either sets
  up or already has the app on Device B.
- **Main flow**: Device B's data is whatever the user has explicitly restored
  via RST-05, or nothing, until the user performs that explicit action. Device
  A's data is never automatically pushed to, pulled by, or merged with Device
  B's data by the application.
- **Acceptance criteria**: No feature of the product causes two devices' data
  to change as a result of the other device's activity, other than through an
  explicit RST-05 restore the user personally performs (Phase 1 §15). Do not
  introduce CRDTs, real-time sync, or cloud replication to satisfy this story
  — the correct implementation is the *absence* of that infrastructure.
- **Priority**: P0 (this is a hard non-goal, not merely unimplemented — it
  should be treated as a regression if any future change introduces implicit
  multi-device behavior)

### SYNC-03 — A failed ONLINE_REQUIRED action is never shown as succeeded [ONLINE_REQUIRED]
- **Actor**: Prospective or returning user
- **Goal**: Never be misled into thinking registration/login/referral
  validation completed when it did not.
- **Preconditions**: A network call for one of these operations fails
  mid-flight (e.g. connectivity drops after the request was sent but before a
  response arrived).
- **Main flow**: The app treats an indeterminate outcome as "not confirmed
  successful" and prompts the user to retry/check status once connectivity is
  stable, rather than optimistically assuming success (contrast with §16's
  optimistic-UI guidance, which explicitly excludes cases where an incorrect
  optimistic result could mislead the user — this is exactly such a case).
- **Acceptance criteria**: No false "registered"/"logged in"/"referral
  accepted" state is ever shown when the corresponding server-side operation
  did not actually complete.
- **Priority**: P0

---

## Errors

### ERR-01 — Consistent error state on any core screen [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Understand what went wrong and what to do next, on any screen.
- **Preconditions**: An operation fails (network error, validation error,
  unexpected failure).
- **Main flow**: Screen shows a specific, actionable error state (not a raw
  technical message) with a retry option where applicable.
- **Acceptance criteria**: Every important screen has a defined error state
  per Phase 1 §16 — this story is the umbrella acceptance criterion the
  per-feature stories above already reference.
- **Priority**: P0

### ERR-02 — Retry after a transient failure [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Recover from a temporary failure without losing context or
  re-entering data.
- **Preconditions**: A transient error occurred (e.g. brief connectivity
  drop).
- **Main flow**: User taps retry → operation re-attempts from where it left
  off where feasible, without forcing a full restart of the flow.
- **Acceptance criteria**: In-progress form data is preserved across a retry
  (ties to autosave, Phase 1 §16).
- **Priority**: P1

---

## Security-Sensitive Workflows

### SEC-01 — Cross-user data isolation [OFFLINE]
- **Actor**: Logged-in user / System
- **Goal**: Ensure a user can never view or modify another user's files,
  contracts, or profile.
- **Preconditions**: At least two user accounts exist with separate data.
- **Main flow**: User A attempts, by any means (direct navigation, search,
  API-level request if applicable), to access User B's data → access is
  denied.
- **Acceptance criteria**: No data-access path exists that bypasses per-user
  authorization (Phase 1 §18). **[ASSUMPTION]** — assumes the single-owner
  model from Phase 1 §2/§18; would need re-scoping if team sharing is later
  approved.
- **Priority**: P0 (security)

### SEC-02 — Sensitive data never appears in logs or backups unprotected [OFFLINE]
- **Actor**: System / QA
- **Goal**: Verify mobile numbers, OTP codes, session tokens, and backup keys
  are never written in plaintext to logs or source control.
- **Preconditions**: Normal app operation, including a failure path (to check
  error logs specifically).
- **Main flow**: Trigger normal and failing operations involving sensitive
  data → inspect logs/build artifacts → confirm no plaintext sensitive values
  appear.
- **Acceptance criteria**: Matches Phase 1 §18 and the Phase 0 §6/§7 findings
  this rule was written to prevent from recurring.
- **Priority**: P0 (security)

### SEC-03 — Destructive action requires explicit confirmation [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: Prevent accidental data loss.
- **Preconditions**: User initiates a delete or restore-overwrite action.
- **Main flow**: System requires an explicit, specific confirmation step
  before the destructive action proceeds.
- **Acceptance criteria**: A single accidental tap can never complete a
  destructive action (Phase 1 §4, §16).
- **Priority**: P0 (security/UX)

### SEC-04 — Session revocation [OFFLINE]
- **Actor**: Logged-in user
- **Goal**: End a session's access, e.g. on suspected compromise or explicit
  logout.
- **Preconditions**: An active session exists.
- **Main flow**: Session is revoked (via logout or another confirmed
  mechanism) → subsequent requests/actions using that session are rejected.
- **Acceptance criteria**: Revocation takes effect without requiring an app
  reinstall or other drastic workaround.
- **Priority**: P0 (security)

---

## Summary

### 1. Confirmed decisions
All stories above implement functional requirements already confirmed in
`/docs/01-product-requirements.md` §19.1, most directly: mandatory
mobile+OTP+referral registration (AUTH-01, REF-03/04), deterministic
AI-independent matching with MUST_HAVE/IGNORE semantics and mandatory
explanations (MATCH-01–05, MEXP-01), idempotent configurable reminders
(REM-01–04), and encrypted/integrity-checked/portable local backups (BKP, RST,
IE) with no cloud backup requirement. **[Added after initial Phase 1
documentation]** Local-first/offline-first is now a confirmed, connectivity-
tagged constraint on every story (§4a of the requirements doc): all business-
data workflows are OFFLINE; only registration, OTP, and referral validation
are ONLINE_REQUIRED (AUTH-01/02/04/05/06, REF-03/04/05/06); reminders use
local device notifications, not push (NOTIF-01/03); and there is no automatic
multi-device sync — cross-device movement is only the explicit RST-05 restore
flow (OFF, SYNC sections, rewritten).

### 2. Open product decisions
- REF-05 (referral single-use vs. reusable) cannot be finalized until Phase 1
  §19.2's open question is answered.
- AUTH-05 (account deletion retention behavior) is similarly blocked.
- FILT-02's exact "what's savable" scope is left flexible pending product
  input.
- ~~SYNC-02's exact conflict-resolution strategy~~ — **resolved**: there is no
  automatic multi-device sync, so no conflict-resolution strategy is needed
  (Phase 0 Decision 4); SYNC-02 now documents this as a confirmed non-goal
  instead of an open question.

### 3. Open architectural decisions
No story above invents an implementation detail Phase 1 left open (encryption
algorithm, OTP provider, RN vs. Capacitor, exact scoring formula, local
storage technology, notification-permission fallback mechanism, final schema).
Where a story's full acceptance criteria depend on one of these, it is called
out inline with **[OPEN-ARCH]**. ~~RST-05 additionally flags one narrower open
question: whether restoring onto a device that already has local data blocks
for confirmation or overwrites~~ — **resolved, FINAL**: neither blocks
indefinitely nor overwrites silently; RST-06 records the mandatory
safety-backup-then-explicit-replace sequence. This is not a reintroduction of
multi-device sync — SYNC-02 remains a confirmed non-goal.

### 4. Assumptions
- Single-owner, single-user-type data model (SEC-01) — consistent with Phase 1
  §2/§18's stated assumption, flagged there for validation.
- Illustrative-only performance expectations are not restated per-story; they
  live in Phase 1 §17 and apply globally.

### 5. Risks
- REF-05 and AUTH-05 are written with dual/placeholder outcomes specifically
  because their acceptance criteria cannot be fully locked before the
  underlying product decision is made — implementing against the wrong guess
  would require rework.
- MATCH-03 and REM-03 are flagged P0 regression scenarios because they encode
  the two most explicit, named correctness guarantees in PRODUCT.md (the pool
  example; reminder idempotency) — any implementation that fails these two
  scenarios has violated a confirmed decision, not just a nice-to-have.
- **[Added after initial Phase 1 documentation]** SYNC-02 is now written as a
  P0 **non-goal** regression test (multi-device sync must not silently appear)
  rather than a feature story — this is an unusual pattern worth flagging
  explicitly so a future implementer doesn't mistake its absence-of-behavior
  acceptance criteria for an unfinished story.

### 6. Questions requiring product-owner input
Same five questions listed in `/docs/01-product-requirements.md` §19.6 — not
repeated in full here to avoid duplication/drift; that document is the single
source of truth for open product-owner questions as of this phase. The
multi-device-use question that was previously question 4 there has been
answered by Phase 0 Decision 4 and is no longer open.
