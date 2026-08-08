# ADR-011 — React Native SQLite Binding Selection

Status: **PROPOSED** — an implementation-level technology choice, not yet
approved by the product owner. Nothing in this document changes any
FINAL decision (`ADR-002` SQLite as the database technology, `ADR-005`
SQLCipher/AES-256 as the at-rest encryption mechanism). It answers a
question those ADRs deliberately left open: which concrete React Native
package implements SQLite access for this specific project.
Date: 2026-08-08

## Problem statement

`ADR-002-local-database-source-of-truth.md` finalized SQLite as the
database technology but explicitly did not select a binding, since that
depended on `ADR-001` (platform) being resolved first. `ADR-001` is now
FINAL (React Native), and `docs/architecture/unresolved-decisions.md`
still lists "exact migration tooling/library choice" as open. Phase 5's
own gate review (`docs/implementation/phase-5-decisions.md`) flagged this
as the one decision that genuinely blocks starting Phase 6, per
`implementation-roadmap.md`'s own instruction: *"this may be the same
library selected in Phase 6, if it supports SQLCipher, or may require
swapping to one that does; this should be decided in Phase 6 with Phase 7
already in mind, so the two phases don't end up needing an incompatible
library swap."*

This ADR exists to make that choice once, correctly, with Phase 7's
SQLCipher requirement already in view — not to pick a plain-SQLite binding
now and discover in Phase 7 that it can't be encrypted without a rewrite.

## Evaluation criteria

Per the brief, each candidate is scored against:

1. Maintenance status (release cadence, open issues, maintainer activity)
2. React Native New Architecture (Fabric/TurboModules/JSI) compatibility
3. React Native 0.86 compatibility (this project's actual RN version, per
   `phase-5-decisions.md`)
4. Android API 26 compatibility (`ADR-010`, FINAL floor)
5. iOS compatibility
6. SQLCipher support quality (native/first-party vs. bolted-on vs. absent)
7. Encryption-at-rest integration difficulty (how directly it satisfies
   `ADR-005`)
8. Native dependency risk (single-maintainer bus factor, build complexity,
   compiled-from-source vs. prebuilt)
9. Xiaomi MIUI/HyperOS compatibility risk
10. Performance characteristics at the 50,000-record tier
    (`04-final-architecture.md` §8's stated performance ceiling)
11. Migration complexity (schema migrations, `migration-strategy.md`)
12. Community adoption / long-term viability

## Compared options

### 1. OP-SQLite (`@op-engineering/op-sqlite`)

- **Maintenance**: actively maintained; frequent releases (v17.x line,
  latest patch published within days of this evaluation), ~20k weekly npm
  downloads.
- **New Architecture**: JSI-based, TurboModule-native — built for the New
  Architecture rather than adapted to it. Early RN pre-release
  (0.74 release-candidate/bridgeless) integration friction was reported
  upstream in the past; the project has since matured through many major
  versions, but **this project's exact RN 0.86.2 + bridgeless
  configuration has not yet been build-tested against it** — flagged as a
  verification task, not assumed clean.
- **RN 0.86 compatibility**: no documented incompatibility found; the
  package tracks current RN releases closely given its release cadence.
- **API 26 / iOS**: compiles from source per-platform; no minimum-API
  floor above 26 documented. Supports both platforms as first-class
  targets (it is the reference implementation the maintainer benchmarks
  against for both).
- **SQLCipher support**: **first-party, documented feature** — SQLCipher
  is an explicit, supported build mode in OP-SQLite's own documentation,
  not a community patch layered on top. This is the single biggest
  differentiator among the options evaluated.
- **Encryption integration difficulty**: low — opening an encrypted
  database is a documented, first-class API path, not something requiring
  a fork or a separate package.
- **Native dependency risk**: single primary maintainer/org
  (OP-Engineering); compiled from source with custom compilation flags
  (a performance advantage, at the cost of a longer/more complex native
  build step than a prebuilt-binary package). Bus-factor risk is real but
  typical of this entire ecosystem category — no alternative evaluated
  here is meaningfully better on this specific axis.
- **Xiaomi risk**: no Xiaomi/MIUI/HyperOS-specific incompatibility
  documented anywhere found during this evaluation. This is not the same
  as "verified compatible" — per `ADR-010`, that requires Phase 14's real-
  device matrix regardless of which binding is chosen.
- **Performance**: markets itself specifically as tuned for large local
  datasets and low-level control (custom compilation flags) — directly
  relevant to this project's 50,000-record performance tier.
- **Migration complexity**: N/A yet (no binding is currently integrated) —
  its API shape (synchronous and async query methods, transaction support)
  maps cleanly onto a typed repository layer.

### 2. react-native-nitro-sqlite (`margelo/react-native-nitro-sqlite`)

- **Maintenance**: actively maintained; the designated successor to
  `react-native-quick-sqlite` (see below), built on Margelo's Nitro
  Modules framework.
- **New Architecture**: Nitro-native by design — arguably the cleanest
  New Architecture integration of the options evaluated, since Nitro
  Modules is itself a New-Architecture-only framework with no legacy-
  bridge fallback path.
- **RN 0.86 compatibility**: requires RN ≥ 0.75 and the Nitro Modules
  runtime dependency — satisfied by this project's RN 0.86.2, but adds a
  second framework dependency (Nitro Modules itself) beyond SQLite access
  alone.
- **API 26 / iOS**: no documented floor above 26; supports both platforms.
- **SQLCipher support**: **not confirmed** — no first-party SQLCipher
  documentation or build mode was found for this package during this
  evaluation, in contrast to OP-SQLite's explicit support. This is a
  disqualifying gap given `ADR-005`'s SQLCipher requirement: choosing this
  binding would mean either finding an unofficial fork, forking it
  in-house, or building a custom SQLCipher integration ourselves — all of
  which contradict the roadmap's own instruction to pick a binding "if it
  supports SQLCipher" rather than accommodate one that doesn't.
- **Native dependency risk**: adds the Nitro Modules framework as a
  transitive dependency surface, on top of the SQLite binding itself.
- **Xiaomi risk**: no Xiaomi-specific incompatibility documented; same
  caveat as above applies (compilation success ≠ verified compatibility).
- **Performance**: benchmarked by its own maintainers as fast (JSI-direct,
  no bridge) — credible for this project's performance tier, but the
  SQLCipher gap makes this moot unless that gap is closed first.
- **Migration complexity**: would require re-evaluating or replacing the
  binding entirely once Phase 7 needs encryption, which is exactly the
  two-phase incompatible-swap scenario the roadmap explicitly warned
  against.

### 3. react-native-quick-sqlite (`margelo/react-native-quick-sqlite`)

- **Maintenance**: **officially deprecated** by its own maintainers as of
  major version 9 — the README states "DEPRECATED: Use
  `react-native-nitro-sqlite` instead." Only limited bug-fix support for
  the legacy 8.x line continues, with no new features.
- **Verdict**: excluded from further comparison. Adopting a package its
  own maintainers have deprecated in favor of a named successor is not a
  defensible choice for new Phase 6 work, regardless of its other
  properties.

### 4. react-native-sqlite-storage (`andpor`/community forks)

- **Maintenance**: **unmaintained** — infrequent updates, a large backlog
  of open issues, and unclear ownership across several community forks.
- **New Architecture**: compatibility status is unconfirmed/unknown; the
  package predates the New Architecture and was built against the legacy
  bridge model.
- **RN 0.86 compatibility**: given the New Architecture is the default
  (and this project's own Phase 5 foundation already builds with
  `newArchEnabled=true`), an unconfirmed-New-Architecture package is a
  material risk, not a theoretical one.
- **SQLCipher support**: SQLCipher integration exists in community
  guidance/forks but is not a first-party, actively maintained feature —
  same "bolted-on" category as the deprecated option above, with the
  added risk of an unmaintained base package underneath it.
- **Verdict**: excluded. Positioned by the wider community itself as "a
  fit for legacy projects," which this is explicitly not.

### 5. Other options considered and excluded without full scoring

- **Official SQLCipher for React Native (Zetetic)**: SQLCipher's own
  vendor (Zetetic) offers a React Native binding, but **gates it behind
  SQLCipher Enterprise Edition**, a paid commercial license. No FINAL or
  PROPOSED document in this project's architecture set budgets for a
  commercial SQLCipher license, and introducing one is a product/legal
  decision, not an implementation one — excluded from this technical
  comparison and flagged in "Risks" below in case the product owner wants
  to consider it separately.
- **Expo SQLite**: excluded — this project is not built on the Expo
  managed workflow (Phase 5's foundation is a bare RN CLI project, per
  `phase-5-decisions.md`), and Expo SQLite does not support SQLCipher.
- **WatermelonDB / Realm / MMKV-as-primary-store**: already evaluated and
  rejected at the technology level in `ADR-002` itself (relational fit,
  query needs of the matching engine) — not re-litigated here, since this
  ADR is scoped to "which SQLite binding," not "which database."

## Security analysis

- `ADR-005` requires SQLCipher/AES-256 with the key held exclusively in
  platform secure storage, never in the database file. Only OP-SQLite
  offers this as a first-party, documented feature among the actively
  maintained options — every other viable candidate would require either
  an unmaintained base package, an unconfirmed community SQLCipher patch,
  or a paid commercial license.
- **No plaintext fallback**: OP-SQLite's SQLCipher mode is an explicit
  build/open configuration, not a runtime toggle that could silently fall
  back to an unencrypted connection on a misconfiguration — this should be
  verified directly against this project's own repository-layer code in
  Phase 7 (write a test that asserts opening the database *without* the
  correct key fails, per Phase 7's own acceptance criteria in
  `implementation-roadmap.md`), not assumed from documentation alone.
- **Key handling**: satisfying `ADR-005`'s "key held exclusively in
  platform secure storage" and the Phase 4B security review's native-
  binding key-zeroization requirement is independent of the SQLite binding
  choice — that's Phase 7's secure-storage wrapper, not something this
  ADR resolves. OP-SQLite accepts a key string to open the database; the
  wrapper that generates, stores, retrieves, and zeroizes that key is
  Phase 7 work regardless of which binding sits underneath it.
- **Migrations under encryption**: transactional per-step migrations
  (`migration-strategy.md`) require the binding to support transactions
  and to fail atomically — OP-SQLite's documented transaction API
  supports this; this should be exercised by Phase 6's own migration
  test suite rather than assumed.

## Recommendation

**PROPOSED (not FINAL): `@op-engineering/op-sqlite`.**

It is the only actively maintained option evaluated that satisfies
`ADR-005`'s SQLCipher requirement as a first-party feature, is built
New-Architecture-native rather than adapted to it, and has no documented
incompatibility with this project's actual RN version, Android floor, or
either target platform. Choosing it now means Phase 6's plain-SQLite work
and Phase 7's SQLCipher work use the same binding throughout — exactly the
outcome the roadmap asked Phase 6 to plan for.

## Risks

- **RN 0.86.2 + bridgeless build not yet verified against this exact
  project.** Historical New Architecture integration friction was found
  in past OP-SQLite issue history (against an older RN release candidate).
  This should be the **first thing verified** at the start of Phase 6 —
  a failed build here is a real, near-term risk to schedule, not a
  hypothetical one.
- **Single-maintainer bus factor.** Typical of this entire ecosystem
  category; not unique to OP-SQLite, but worth naming rather than ignoring.
- **Xiaomi/MIUI/HyperOS compatibility is unverified for all options**,
  including the recommendation — this ADR cannot close that gap; only
  Phase 14's real-device matrix can, per `ADR-010`.
- **Compiled-from-source native dependency** increases local build
  complexity (native toolchain requirements on both platforms) compared to
  a prebuilt-binary package — a real cost to Phase 5/6 developer
  experience, accepted here because no prebuilt alternative satisfies the
  SQLCipher requirement.
- **SQLCipher Enterprise Edition (Zetetic) was not selected** — if the
  product owner has a reason to prefer the vendor-official binding despite
  its cost, that is a decision this ADR does not foreclose, only
  deprioritizes on technical/cost grounds. Flagged explicitly so it is not
  silently dropped.

## Migration impact

- No existing code depends on any SQLite binding today — `src/core/` and
  `src/infrastructure/` are empty per Phase 5's own audit
  (`phase-5-decisions.md`), so adopting this recommendation has zero
  migration cost from a prior binding.
- Choosing OP-SQLite now, with Phase 7 already in view, avoids the
  specific failure mode the roadmap warned about: building Phase 6's
  schema and repository layer against a binding that then has to be
  swapped out when Phase 7 needs encryption, forcing every repository
  method to be rewritten against a new API shape.
- If this recommendation is rejected in favor of a different option, the
  cost is contained to Phase 6 not having started yet — no rework, only a
  delayed start.

## Status

**PROPOSED.** Awaiting explicit product-owner approval before Phase 6
implementation begins. Per this project's standing rule, this
recommendation must not be treated as FINAL by default, and no Phase 6
code should be written against it until approved.
