# Testing Strategy

Status: PROPOSED — the complete testing plan for implementation, covering
every phase in `implementation-roadmap.md`. This document defines what
gets tested and why; it does not itself contain test code, since no
application code exists yet.
Date: 2026-08-08

## Why this document exists separately from each phase's own test section

`implementation-roadmap.md` already lists tests for every phase, scoped to
what that phase can verify in isolation. This document is the
cross-cutting view: the full test taxonomy, the catastrophic scenarios
that only make sense to test against an integrated application, and the
security test matrix that spans several phases' work at once. Phase 14
(Testing & Quality) is where this document's plan actually gets executed
in full, but individual test categories start much earlier — a
catastrophic-scenario test for "database corruption," for instance, needs
Phase 6's database and Phase 7's encryption to exist, but doesn't need to
wait for Phase 12's UI.

## Test taxonomy

| Category | What it verifies | Primarily written during |
|---|---|---|
| Unit tests | A single function or class in isolation — the matching engine's per-criterion evaluation, a repository method, a date-offset calculation | Every phase, as code is written |
| Integration tests | Two or more modules working together correctly — a repository method against a real SQLite instance, a full registration flow against the stub backend | Every phase, for that phase's own module boundaries |
| Database tests | Schema correctness, constraint enforcement, query correctness | Phase 6, extended in Phase 7 |
| Migration tests | The migration chain runs correctly forward, fails safely, never leaves a half-migrated database | Phase 6, re-verified in Phase 16 (version-upgrade test) |
| Backup tests | Backup creation, validation, and the full six-check restore-validation ordering | Phase 7 |
| Restore tests | The full restore state machine, including every failure branch | Phase 7 (isolated), Phase 13 (integrated) |
| Matching tests | Every match type and priority-level behavior from `matching-scoring-spec.md` | Phase 9 |
| Authentication tests | Registration/login flow, and specifically the NETWORK FAILURE vs. AUTHENTICATION FAILURE distinction | Phase 8 |
| Notification tests | Reminder generation idempotency, device-restart recovery, permission-denied handling | Phase 10 |
| RTL tests | Layout mirroring, Vazirmatn rendering, numeral rules, icon-mirroring rules | Phase 11 (foundation), Phase 12 (per screen) |
| Accessibility tests | Touch targets, screen-reader labels, focus order, contrast | Phase 11, Phase 14 |
| Performance tests | Targets in `04-final-architecture.md` §8, measured against real datasets | Phase 13 (first integrated measurement), Phase 14 (full pass) |
| Security tests | The dedicated matrix below | Phase 7 (crypto core), Phase 14 (full matrix), Phase 15 (independent audit) |
| End-to-end tests | Full user journeys spanning multiple modules and real screens | Phase 13 |

## Catastrophic-scenario testing

These scenarios are named explicitly because each one represents a moment
where getting the response wrong doesn't just produce a bug — it risks
real user data, which is the one thing this local-first product cannot
treat as recoverable-by-default. Every scenario below must have a test
verifying the *specific correct behavior*, not just "the app doesn't
crash."

| Scenario | Required correct behavior | Verified by |
|---|---|---|
| **Corrupted backup** | Detected at the payload-authentication step (`backup-encryption-design.md` §6, step 4); user sees a corruption-specific message (`restore_corrupted_backup`); existing data untouched | Phase 7 unit test (a deliberately corrupted test fixture), re-verified end-to-end in Phase 13 |
| **Wrong password** | Detected at the DEK-unwrap step (§6, step 3); user sees a password-specific message, distinct from corruption, with attempt context; existing data untouched | Phase 7 unit test, Phase 13 E2E |
| **Interrupted restore** (app killed mid-`RESTORING`) | On next launch, the live database is exactly as it was before the restore attempt started — the staged copy is either resumed-and-revalidated or discarded, never treated as a partial live database | Phase 13 integration test simulating a process kill during staging |
| **Insufficient storage** (device runs out of space mid-backup-creation or mid-restore-staging) | The operation fails cleanly with a storage-specific message; no partial/corrupt file is left in a state that looks valid; existing data untouched | Phase 7/13 test using a simulated or artificially constrained storage environment |
| **App crash during restore** | Same guarantee as "interrupted restore" above — the state machine's `ATOMIC_SWAP` being the only point where the live database changes means a crash before it is always safe | Phase 13 integration test |
| **Database corruption** (the live SQLite/SQLCipher file becomes unreadable, independent of any restore operation — e.g. a storage fault) | The app detects this at startup (fails to open, or fails an integrity check if one is added per `local-data-architecture.md`'s open item) rather than operating against a partially-readable database; the user is guided toward restoring from a backup | Phase 6/7 test using a deliberately corrupted test database file |
| **Failed migration** | Transaction rollback leaves the database at its prior version; the app does not proceed to normal operation against an uncertain schema state; the user is guided toward a backup-restore path or a fixed app update | Phase 6 test with a deliberately failing migration step |
| **Network failure** (during registration/login, or during opportunistic session re-validation) | Registration/login: a clear, distinct "no connectivity" error, retry available, no partial account state created. Session re-validation: the session remains valid, per `ADR-008` — this is the single most safety-critical test in the whole authentication module | Phase 8 unit/integration test, specifically simulating timeout, connection-refused, and DNS-failure conditions separately, since each should be classified as NETWORK FAILURE identically |
| **Authentication failure** (explicit server rejection) | The local session ends and the user is routed to re-authenticate; local business data itself remains on the device (ending a session is not the same as deleting data) | Phase 8 test with a simulated "session invalid" server response |
| **Duplicate reminder** | Running reminder evaluation twice (e.g. an app-open trigger and a background trigger overlapping) produces exactly one `Reminder` row per `(contract_id, offset)`, never two | Phase 10 test simulating concurrent evaluation calls |
| **Duplicate referral** | A second attempt to attach a referral relationship to an already-registered account is rejected server-side; the client-side code has no path that would even attempt this, per `ADR-009`'s immutability rule | Phase 8 integration test against the stub backend, asserting rejection |
| **Malicious backup** | A backup file crafted to exploit the parser (prototype pollution, resource-exhaustion record counts, path-traversal-style content) is rejected by the structural-validation step (`backup-encryption-design.md` §11.6) without executing attacker-controlled logic or exhausting device memory | Phase 7 test suite with deliberately adversarial fixture files, extended in Phase 15's security audit with fixtures an independent reviewer constructs (not ones the implementing engineer already knows will be caught) |

## Security testing matrix

| Test area | What's verified | Method |
|---|---|---|
| Backup confidentiality | A backup file, inspected directly (hex/file tool) without the correct password, reveals no readable business data | Phase 7 automated test + Phase 15 manual verification |
| Backup integrity | Any single-bit modification to a backup file is detected before its contents are trusted | Phase 7 automated test (mutation testing across header and payload bytes) |
| Password brute-force resistance | The Argon2id parameters, once benchmarked (`backup-encryption-design.md` §3.1), impose the intended per-guess cost on the target low-end device | Phase 7 benchmark run, re-verified in Phase 15 against a release-configuration build |
| Database extraction resistance | A raw copy of the SQLCipher database file, without the key, reveals no readable business data | Phase 7 automated test + Phase 15 manual verification (extract the file from a test device, attempt to open it directly) |
| Key storage | Session credentials, database key, and backup key material are never found in plain app storage, only in platform secure storage | Phase 7/8 automated test inspecting app-private storage contents after normal use |
| Temporary-file leakage | No plaintext business-data file exists on disk at any point during backup creation or restore, including staging | Phase 7 automated test (the direct verification of the Phase 4B review's HIGH finding's fix) — this is not optional, it is the single highest-priority security test in the whole suite |
| Logging leakage | No secret value (password, key material, session token, OTP code) appears in captured log output across a full exercised test run | Phase 7/8/14 automated log-scanning test |
| Clipboard leakage | If a "copy to clipboard" convenience is ever added for the backup password field, it's evaluated against this specific risk before shipping — until then, this test simply confirms no such feature exists | Phase 12 (if the feature is ever added) — currently a design-decision gate, not a code test |
| Notification leakage | Lock-screen notification content matches whatever visibility decision is made (§"Notification leakage" in `threat-model.md`) — generic text by default pending that decision | Phase 10/12 manual verification on a locked test device |
| Root/jailbreak behavior | The app's behavior on a rooted/jailbroken test device matches whatever detection/warning decision is made (currently none — behaves identically to a normal device, which is itself the thing to verify, so an untested assumption doesn't quietly become "we handle this") | Phase 15 manual test on a rooted/jailbroken test device |
| App tampering | A modified/repackaged client cannot bypass server-side referral/OTP/rate-limit enforcement | Phase 15 penetration-testing-style manual test against the stub or real backend |
| OTP abuse | Rate limiting and retry limits (server-side, per `ADR-009`) actually reject excessive attempts rather than merely being documented as required | Phase 8/15 test against the backend's actual enforcement, not just the client's UI behavior |
| Referral manipulation | Self-referral, post-registration referral changes, and referral-code reuse beyond whatever policy is confirmed are all rejected server-side | Phase 8/15 test, directly exercising `ADR-009`'s immutability rule |
| Replay | A captured registration/login request, replayed, does not succeed a second time (OTP single-use enforcement) | Phase 8/15 test |
| Input validation | Every user-facing input (phone number, OTP, referral code, file fields, backup password) rejects malformed/oversized/malicious input at the boundary it enters, not deep inside business logic | Phase 8/9/12 unit tests per input surface |

Use `/ai-generated-code-security-auditor`, `/security-architect`, and
`/penetration-tester` for Phase 15's execution of this matrix against
real code — this document defines what the matrix covers; Phase 15 is
where it's actually run by an independent reviewer, which matters
specifically because the person who wrote a piece of code is a poor judge
of whether they've tested it adversarially enough.

## RTL and accessibility testing

- Every screen in `ui-screen-mapping.md` with an RTL counterpart is tested
  in both directions — not just "the RTL screen renders," but that
  Vazirmatn loads correctly, layout mirrors correctly, directional icons
  mirror while entity icons don't (per `design-system.md` §13's explicit
  rules), and numeral rules are followed (Persian digits in prose,
  Western digits in currency/phone/percentage contexts).
- Accessibility testing follows `design-system.md` §20's checklist:
  keyboard/screen-reader focus order, `aria-label`-equivalent
  accessibility labels on every icon-only control (a known gap flagged in
  `design-system-audit.md`, to be closed during Phase 12's implementation,
  not deferred), and the 48dp touch-target minimum verified
  programmatically wherever the testing tooling allows, not just visually
  inspected.

## Performance testing

Test datasets, per `04-final-architecture.md` §8: 100, 1,000, 10,000, and
50,000 records (owner files, applicant files, and contracts, generated as
realistic synthetic test data — not hand-authored, since 50,000 hand-
authored records isn't practical, and not degenerate/repetitive data
either, since that could make indexed queries look faster than they'd be
against realistic value distributions).

| Target | Measured at | Method |
|---|---|---|
| Cold start | Phase 5 baseline, re-measured every subsequent phase | Automated timing on real low-end and mid-range test devices |
| Warm start | Same as above | Same |
| Database queries (list/search/filter) | Phase 6 in isolation, Phase 13 integrated | Query timing against each dataset tier |
| File-list scrolling | Phase 12/13 | Frame-rate measurement during scroll on a real device, not a simulator |
| Search | Phase 6/13 | Query timing, both structured-field and free-text (FTS) paths |
| Matching | Phase 9 in isolation (in-memory), Phase 13 integrated (real SQL pre-filtering) | Timing Stage 1 filtering separately from Stages 2-4, so a slow result can be attributed to the right stage |
| Backup creation | Phase 7 | Timing across dataset tiers, since a larger business-data snapshot takes proportionally longer to encrypt |
| Backup restore | Phase 7/13 | Same, plus the fixed Argon2id cost (measured separately, since it doesn't scale with dataset size) |
| Notification scheduling | Phase 10 | Timing reminder evaluation across a realistic contract count |

Benchmarking is explicitly required (not optional) for: the Argon2id
parameters (`backup-encryption-design.md` §3.1), matching-engine
performance at the 10,000 and 50,000-record tiers (where Stage 1's
SQL-pushable filtering becomes load-bearing, per `ADR-006`), and cold
start on the lowest-spec device the product commits to supporting — all
three are named in prior architecture documents as needing real
measurement, not estimation, and this document does not relax that.

## What this document does not cover

Exact test framework selection (Jest is assumed for unit/integration
testing as the RN ecosystem standard, but this isn't fixed here as a
hard requirement), exact E2E tooling (Detox or Maestro, per `ADR-001`'s
own analysis of RN's testing ecosystem — a Phase 5 decision, not this
document's), and CI pipeline configuration — all implementation-phase
details that don't change what gets tested, only how the test run is
automated and reported.
