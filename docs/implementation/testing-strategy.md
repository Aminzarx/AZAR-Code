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

## Android version and device compatibility matrix

**[FINAL, `ADR-010-minimum-android-version-and-xiaomi-compatibility.md`]**
Android 8.0 (API 26) is the minimum supported version, and Xiaomi devices
are a first-class, non-negotiable compatibility target — restated here as
the concrete test matrix that decision requires, since a policy statement
without a test plan attached to it doesn't actually verify anything.

| Android version | Status | Notes |
|---|---|---|
| Android 8 / API 26 | **Mandatory — this is the floor** | The version every release-blocking test in this document must pass on, not just "should probably work on." |
| Android 9+ | Mandatory | |
| Android 10+ | Mandatory | Scoped storage changes begin here — relevant to backup export/import and restore staging file handling (`backup-encryption-design.md` §11.3-§11.4). |
| Android 11+ | Mandatory | Further scoped-storage tightening. |
| Android 12+ | Mandatory | Notification permission model changes begin around this range depending on target SDK — relevant to `ADR-007`'s notification-permission-denied handling. |
| Android 13+ | Mandatory | Runtime notification permission (`POST_NOTIFICATIONS`) becomes an explicit runtime grant — this changes how NOTIF-03's "in-app history exists regardless of permission state" requirement is actually exercised in testing, since the denial path is now a normal runtime permission flow rather than a settings-only toggle. |
| Android 14+ | Mandatory | |
| Android 15+ | Mandatory | |
| Current Android version at implementation time | Mandatory | Whatever is the latest stable release when Phase 14 actually runs — named as "current," not pinned to a specific number in this document, since a version-numbered document written before implementation starts would otherwise go stale the moment a new Android version ships. |

**Xiaomi is a mandatory test category, tested on real devices, at every
Android version tier where a real Xiaomi device running that version is
reasonably obtainable** — not simulated, and not considered verified
merely because a build succeeds or an emulator runs it. MIUI/HyperOS's
behavioral deviations from stock Android (`ADR-010`'s checklist) are
precisely the kind of thing an emulator, which runs closer to stock
AOSP behavior, will not surface.

### Priority real-device test set

Where real devices are available (required, not optional, before a
release is considered Xiaomi-verified):

1. One Xiaomi low/mid-range device.
2. One Xiaomi mid/high-range device.
3. One non-Xiaomi low/mid-range Android device (for a comparison baseline
   — confirms a given failure is genuinely Xiaomi-specific rather than a
   general low-end-hardware issue).
4. One Google/stock-like Android device (the closest thing to a "clean"
   AOSP reference point, useful for isolating manufacturer-specific
   behavior from Android-version-specific behavior).

Emulators and CI-based automated testing remain valuable for the broader
version matrix above and for fast iteration during development — they are
not a substitute for the real-device set for the specific Xiaomi
behaviors named in `ADR-010`, several of which (aggressive background
process killing, MIUI's autostart permission model) either don't
reproduce in an emulator at all or behave differently enough to be
misleading if treated as equivalent.

## Xiaomi stability non-functional requirement

**"Application stability on Xiaomi devices is a release-blocking
requirement."** Restated here as a formal non-functional requirement,
with an explicit definition of what counts as a release-blocking failure
— so "stability" isn't left as a vague aspiration nobody can actually
check a release against:

| Release-blocking failure | Why it blocks release |
|---|---|
| Unexpected app termination/crash | Basic reliability floor — no app-defect-driven crash is acceptable, and this is the single most user-visible failure category. |
| Repeated startup crash loop | Worse than an ordinary crash — the app becomes entirely unusable, potentially requiring an uninstall to recover. |
| Database corruption | Directly threatens the sole copy of a user's business data, per this product's local-first model — the single highest-stakes failure category in the entire testing strategy. |
| Inability to open the encrypted local database | Functionally equivalent to data loss from the user's perspective, even if the underlying file is intact. |
| Backup/restore failure caused by device/platform behavior (not user error) | Undermines the one recovery path this product's local-first model depends on — if backup/restore itself is unreliable on Xiaomi, the "no safety net without a backup" risk `local-data-architecture.md` already names becomes materially worse for a large share of real users. |
| Scheduled local reminders silently failing | A reminder that doesn't fire and gives no indication it didn't is worse than an app that visibly tells the user something went wrong — silent failure of the contract-reminder system directly undermines the product's core value proposition for its stated use case. |
| Data loss after process death/restart | The exact failure mode MIUI's aggressive process management makes more likely than on stock Android — must be verified as *not* occurring, not assumed safe because it doesn't occur on other devices. |
| Migration failure | Same consequence as database corruption if it leaves the database in an uncertain state — `migration-strategy.md`'s fail-closed requirement must hold on Xiaomi specifically, not just in a controlled test environment. |
| UI becoming unusable after lifecycle recreation | Xiaomi's process/activity recreation behavior can differ from stock Android's; a screen that loses its state or renders incorrectly after recreation is a real, testable failure, not a theoretical one. |

A release candidate exhibiting any failure in this table, on any device in
the priority real-device test set (above), does not ship until the
failure is fixed and re-verified — this is a hard gate on Phase 16
(Release Preparation), not a "known issue" to document and ship anyway.

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
