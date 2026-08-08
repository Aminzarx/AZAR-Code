# ADR-010 — Minimum Android Version and Xiaomi Device Compatibility

Status: **FINAL.** Confirmed by the project owner before Phase 5
implementation begins.
Date: 2026-08-08

## Context

`ADR-001` finalized React Native as the platform but deliberately left
the minimum supported OS version open — that was correctly scoped as a
separate, product-facing decision rather than a technical one bundled
into the framework choice. It mattered more than a footnote, though:
`backup-encryption-design.md` §3.1's Argon2id benchmarking procedure
explicitly depends on knowing "the slowest device the product commits to
supporting," and `04-final-architecture.md` §11 named this as an open
risk. This ADR closes that gap, and adds a second, related decision the
project owner raised independently: Xiaomi devices are not a "nice to
handle if we get to it" compatibility target — they are a first-class,
release-blocking platform requirement.

Both decisions belong in one ADR because they're linked in practice: a
low-end Xiaomi device running a several-year-old MIUI build is close to
the actual worst case this minimum-version decision needs to hold up
against, not a hypothetical one.

## Decision

### Minimum Android version

**Android 8.0 (API level 26) is the minimum supported Android version,
FINAL.** This is a floor, not a target — the app must run correctly on a
real API 26 device, not merely fail to crash on launch.

- **Target/compile SDK**: the latest stable Android SDK available at
  build time, per standard Android release practice — this is
  independent of the minimum-supported-version decision and should track
  current tooling as implementation proceeds, not be pinned to whatever
  was "latest" on the date this ADR was written.
- **No silent minimum-version increases.** The minimum stays at API 26
  regardless of convenience, a library's own default `minSdkVersion`, or
  the availability of a newer platform API that would make some feature
  easier to build. If a real technical blocker against API 26 is
  discovered during implementation, that is a **[STOP — document the
  conflict, identify the affected requirement, propose alternatives, wait
  for approval]** situation per the project's own implementation control
  rules, not a decision an implementer makes unilaterally by bumping the
  number.
- **Every dependency is checked for API 26 compatibility before
  adoption**, not after. This is a gate at selection time, not a bug to
  fix once a library already has code depending on it. Where a library
  the team wants to use doesn't support API 26, the response is finding a
  compatible alternative, not raising the minimum version to accommodate
  the library — the constraint flows from the product requirement to the
  tooling choice, never the other way around.

### Xiaomi device compatibility

**Xiaomi devices (MIUI and HyperOS) are a first-class supported platform,
not an optional or best-effort target — this is a NON-NEGOTIABLE
requirement, FINAL.** Xiaomi ships one of the most heavily modified
Android experiences in the market, particularly around background
process management and notification delivery, and a real share of this
product's target users (real-estate agents, a market with broad
Android-device diversity) plausibly carry Xiaomi hardware. Treating it as
an edge case discovered late in testing would be treating a large,
predictable population of real users as an afterthought.

Specific areas requiring deliberate design and testing attention on
Xiaomi devices — restated as a checklist so nothing on this list gets
silently assumed to "probably just work" the way it might on a
stock-Android reference device:

- Aggressive battery/background process management (MIUI's autostart
  restrictions, battery saver, and "no restrictions" permission model)
- Application lifecycle and process recreation behavior
- Local notification scheduling and delivery — the area with the most
  documented, widely-reported Xiaomi-specific failure modes across the
  Android ecosystem generally, and directly relevant to this product's
  reminder system (`ADR-007`)
- Notification permission/settings behavior, including MIUI's own
  notification-management UI layered on top of standard Android
  permissions
- SQLite/SQLCipher database stability under Xiaomi's process/memory
  management
- Encrypted database access — specifically, whether MIUI's aggressive
  process killing can interrupt a database operation mid-write in a way
  stock Android wouldn't as readily
- Encrypted backup creation/import/restore, including MIUI's
  scoped-storage and file-manager behavior
- Filesystem and scoped-storage behavior generally
- App startup and cold-start stability, including MIUI's own app-launch
  optimization behavior
- Activity/process recreation on configuration changes
- Memory pressure and low-memory-device behavior (relevant given Xiaomi's
  strong presence in the budget/mid-range device segment)
- App updates and database migrations surviving Xiaomi's update/reinstall
  flows
- Background restrictions specifically (distinct from general lifecycle
  behavior — MIUI's background-restriction UI is a separate mechanism
  from stock Android's)
- Device reboot behavior and notification rescheduling after reboot
- Permission changes (a user revoking a permission mid-use, and how the
  app responds)
- App force-stop behavior (MIUI exposes this more prominently to users
  than stock Android does, making it a more commonly-hit real-world case)
- Xiaomi-specific security/privacy restrictions (MIUI's own permission
  and privacy dashboard layered on top of standard Android's)

**Do not solve a Xiaomi-specific problem by weakening the application's
security model.** If a Xiaomi behavior conflicts with a security
requirement already finalized elsewhere in this document set (at-rest
encryption, backup encryption, the restore state machine's invariants),
the correct response is finding a Xiaomi-compatible way to satisfy the
existing requirement — e.g. handling MIUI's aggressive process killing by
making database writes properly transactional and resumable (which
`local-data-architecture.md` already requires for entirely separate
reasons), not by reducing encryption strength, skipping validation steps,
or loosening the restore state machine's guarantees to work around a
device quirk.

## Alternatives considered

- **A higher minimum version (e.g. API 29/Android 10), simplifying some
  implementation work** — rejected. A materially higher floor would
  exclude a real population of users on older or budget devices, which
  cuts against this product's practical reach without a technical
  requirement forcing it; nothing in this project's confirmed
  requirements needs an API level newer than 26 to be satisfied.
- **Treating Xiaomi as "best effort, fix issues as reported post-launch"**
  — rejected. Given how well-documented Xiaomi's background-process and
  notification-delivery deviations from stock Android already are across
  the broader Android developer community, discovering them for the
  first time via user bug reports after release would be avoidable, not
  a genuinely unpredictable risk.

## Consequences

- Every native module and RN library selected from Phase 5 onward carries
  an explicit API 26 compatibility check as part of its selection
  criteria, documented at the point of selection (e.g. in the relevant
  phase's own notes), not assumed.
- The Argon2id benchmarking procedure (`backup-encryption-design.md`
  §3.1) now has a concrete device-tier target: a low/mid-range Xiaomi
  device running at or near API 26 is at least as demanding a benchmark
  target as this decision's floor requires, and should be one of the
  devices actually used for that benchmark, not just a generic "low-end
  Android phone."
- `implementation-roadmap.md` and `testing-strategy.md` are extended
  (this same pass) with a full Android version/device compatibility
  matrix and an explicit Xiaomi-stability non-functional requirement,
  since a decision this specific needs a concrete test plan attached to
  it, not just a policy statement.
- Local-notification scheduling (`ADR-007`) implementation must account
  for MIUI's autostart/background restrictions specifically — this may
  mean guiding users to grant autostart permission explicitly (a
  Xiaomi-specific onboarding/settings consideration) rather than assuming
  the OS will honor a scheduled notification the same way stock Android
  does. This is a **new, UX-relevant implementation detail**, not
  designed in full here — flagged for Phase 10/12.

## Security implications

None of the Xiaomi-specific mitigations above may reduce the security
guarantees already finalized in `ADR-004`, `ADR-005`, or the restore
state machine (`04-final-architecture.md` §7) — restated explicitly
because "the device behaves unusually" is exactly the kind of pressure
that tempts a shortcut under implementation time pressure, and this ADR
exists partly to remove that temptation by settling the requirement now,
calmly, rather than under a late-stage bug-fix deadline.

## Performance implications

API 26 and Xiaomi low/mid-range hardware together define the realistic
performance floor this product needs to hit — `04-final-architecture.md`
§8's performance targets should be read as targets *on this floor
hardware*, not on whatever device the implementing team happens to
develop on, which is very likely to be materially faster.

## Status

**FINAL.** Both the Android 8/API 26 minimum and Xiaomi's non-negotiable
first-class-support status are confirmed product decisions, not open for
reconsideration during implementation without a documented, approved
exception per the project's standing implementation-control rules.
