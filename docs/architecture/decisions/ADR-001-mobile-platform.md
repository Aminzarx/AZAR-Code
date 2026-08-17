# ADR-001 — Mobile Platform: React Native vs. Capacitor

Status: **FINAL.** Decision: **React Native.** Confirmed by the project
owner in the Phase 4B product-decisions pass, after one last check against
the complete requirement list (real mobile app, Android/iOS, offline-first,
SQLite, encrypted local data, encrypted portable backup, local
notifications, high-performance lists, gesture-heavy interaction,
one-handed UX, RTL/Persian, performance, minimal professional UI) turned
up no previously undocumented blocker. Capacitor is no longer an option
under active consideration — later architecture and implementation work
should not introduce Capacitor-specific tooling, plugins, or patterns.
Date: 2026-08-08 (finalized)

## Context

Phase 0 confirmed the product must be a real mobile app (Decision 1), not the
existing Electron scaffold. Phase 1/2 sharpened this into a hard
local-first/offline-first constraint (Decision 4): the local database is the
source of truth, the app must fully function offline, and the entire online
surface is registration/OTP/referral. Phase 0's preliminary read favored React
Native; this ADR re-examines that against the full requested criteria list
now that Phase 1/2 requirements are locked.

## Decision drivers (from the project owner's Phase 3 request)

Offline-first, local database performance, encryption, secure key storage,
local notifications, backup/import/export, file system access, background
tasks, one-handed UX, gesture performance, startup performance, large local
datasets, maintainability, ecosystem maturity, testing, future scalability.

## Options considered

- **Option A: React Native** — native UI components rendered via the RN
  bridge/new architecture (Fabric/TurboModules), business logic in
  JavaScript/TypeScript, native modules for platform integration.
- **Option B: Capacitor** — a WebView-hosted web app (the existing
  React/TypeScript renderer's architecture, structurally) with native plugin
  bridges for device APIs.
- (Rejected outright, not analyzed in depth: staying on Electron — ruled out
  by Phase 0 Decision 1; a fully native Swift/Kotlin build per platform —
  not raised by the project owner and would abandon the existing
  React/TypeScript investment entirely without a stated reason to.)

## Analysis by decision driver

| Driver | React Native | Capacitor | Notes given local-first constraints |
|---|---|---|---|
| **Offline-first fit** | Designed around this pattern from the start; most RN offline-first reference architectures assume a local DB as source of truth already. | Achievable, but the WebView boundary means every local-DB call crosses a JS↔native bridge that's an extra hop versus RN's more direct native-module path, and the web-storage sandboxing model (e.g. IndexedDB/OPFS quotas, eviction policies) was designed for a website that assumes it might lose its data, not for a system-of-record. | Matters directly: Decision 4 makes the local DB "the source of truth," not a cache — Capacitor's storage model was not designed for that role, RN's more commonly is. |
| **Local database performance** | Native SQLite bindings (e.g. OP-SQLite, `react-native-sqlite-storage`, `react-native-nitro-sqlite`) run largely off the JS thread with efficient native marshaling; mature for large local datasets. | SQLite is reachable via a WebView plugin (e.g. Capacitor SQLite plugin, itself often backed by a native implementation with JS bridging), but every query result still crosses the same bridge a web app uses to talk to native code, which is one abstraction layer further from the DB engine than RN's native-module call. | Given the matching engine (§ below) needs to run range/exact/approximate queries across potentially thousands of local records fast enough to feel synchronous (Phase 1 §17), the shorter path favors RN. |
| **Encryption / secure key storage** | First-class native modules (e.g. platform Keychain/Keystore wrappers) with no extra bridging layer beyond the same JS↔native pattern used everywhere else in the app. | Same capability exists via native plugins, but security-sensitive code paths benefiting from being "as close to the OS as possible" are one layer further from it. | Both are workable; RN has a slight structural edge, not a capability gap — Capacitor is not disqualified here. |
| **Local notifications** | Native local-notification scheduling APIs are directly wrapped; well-trodden for RN. | Available via Capacitor's Local Notifications plugin; equally functional in practice. | Roughly even — both meet the local-notification requirement (§ notification architecture doc) without difficulty. |
| **Backup/import/export (file system access)** | Native file-system modules give direct access to app-sandboxed storage and share sheets for export/import. | Capacitor's Filesystem plugin provides equivalent capability. | Roughly even. |
| **File system access (general)** | Same as above — native modules, mature. | Same as above — plugin-mediated, mature. | Roughly even. |
| **Background tasks** | Native background-task APIs (e.g. periodic background fetch/task scheduling) are available via RN modules, subject to the same OS-level restrictions (iOS background execution limits, Android Doze/battery optimization) regardless of framework. | Same OS-level restrictions apply; Capacitor plugins wrap the same native APIs. | Roughly even — the real constraint here is the OS, not the framework. Neither eliminates the OS restrictions covered in the reminders/notifications analysis. |
| **One-handed UX / gesture performance** | Renders through native UI components (or a native-composited layer under Fabric), which generally handle high-frequency gesture events (swipe-to-archive, bottom sheets) with less risk of jank than a WebView compositing gestures through the browser engine. | WebView-based gesture handling can feel smooth with careful engineering, but has a lower performance ceiling under sustained gesture-heavy interaction (rapid list swipes, drag interactions) — the WebView's own scroll/paint pipeline sits between the gesture and the screen. | This is where PRODUCT.md's "extremely fast," "one-handed," gesture-rich requirements (swipe actions, bottom sheets) most directly favor RN — this is a UX-quality risk for Capacitor, not a hard blocker. |
| **Startup performance** | RN cold start includes JS bundle load + native init; well-optimized RN apps start comparably to native apps with Hermes/new-architecture tooling. | Capacitor cold start includes WebView initialization + web bundle load, which has historically been a heavier startup cost than a native shell, though modern WebViews have narrowed this gap. | Modest edge to RN for the "extremely fast" startup requirement (Phase 1 §17), not decisive on its own. |
| **Large local datasets** | Rendering large lists (owner files, applicant files, match results) benefits from native list virtualization (e.g. FlashList-class tooling) tuned for RN's native component model. | Web-based virtualized lists are also mature, but rendering thousands of DOM nodes' worth of virtualized content in a WebView has historically been more prone to scroll jank than native list components at the same scale. | Directly relevant to Phase 1 §17's "large datasets must not degrade list rendering" requirement — edge to RN. |
| **Maintainability** | Larger surface area (native module ecosystem, occasional native-code debugging), but a very standard, widely documented mobile architecture. | Smaller conceptual jump for a team already thinking in web/React/TypeScript terms — the existing renderer code's *patterns* (not its Electron-specific code) are closer to directly applicable. | Genuine trade-off, not one-sided: favors Capacitor **if** the team's strength is specifically web development with limited mobile-native experience; favors RN if long-term mobile-specific investment is expected. Team composition is a fact the project owner has, not one this document can assume. |
| **Ecosystem maturity** | Very large, mature ecosystem specifically for mobile (navigation, local DB, secure storage, notifications, gestures) with long production track records at scale. | Mature as a "web app in a native shell" pattern (broad plugin ecosystem via Capacitor/Ionic), but the plugins most relevant here (SQLite, secure storage, background tasks) are a thinner, more specialized subset than RN's equivalent. | Edge to RN specifically for this product's plugin needs (local DB, secure storage, local notifications, background tasks) — those are exactly Capacitor's thinner areas relative to general web-plugin coverage (e.g. camera, share, network status). |
| **Testing** | Strong unit/integration testing tooling (Jest + RN Testing Library) and mature E2E options (Detox, Maestro) purpose-built for RN's native component tree. | Standard web testing tools (Jest, Playwright/Cypress-style) apply directly to the web layer; E2E testing of the native shell itself adds an extra layer (testing a WebView-hosted app end-to-end natively) beyond testing the web content alone. | Slight edge to RN for native-feeling E2E coverage of gesture/navigation flows; both support solid unit testing of the deterministic matching engine's core logic equally well, since that logic is plain TypeScript regardless of platform (see matching architecture doc — the engine itself should be platform-agnostic code either way). |
| **Future scalability** | If the product later needs deeper native integration (e.g. richer background sync jobs, native widgets, tighter OS calendar/contacts integration) RN has a shorter path to that. | If the product stays primarily forms/lists/data-entry-shaped and never needs deep native integration, Capacitor's ceiling may never actually be reached in practice. | Depends on how far "future scalability" is expected to go — favors RN if native-depth features are plausible later, roughly even if not. |

## Decision

**React Native.** The reasoning is unchanged from the original analysis
above, because nothing about the product's requirements has changed since
it was written: this product's defining technical challenge is a **local
database acting as the sole source of truth**, queried frequently by a
**deterministic matching engine** across **potentially large local
datasets**, rendered in **gesture-rich, one-handed, "extremely fast"** UI.
Every one of those four requirements individually favors the shorter, more
native-direct path RN offers over Capacitor's WebView-mediated one. The
final requirement list carried into this decision — real mobile app,
Android/iOS, offline-first, SQLite, encrypted local data, encrypted
portable backup, local notifications, high-performance lists,
gesture-heavy interaction, one-handed UX, RTL/Persian, performance, minimal
professional UI — does not introduce anything the original analysis didn't
already weigh.

**The two factors this document previously couldn't see** — team
composition and reuse intent for the Electron renderer — are resolved by
this decision itself: the project owner's confirmation means those factors
either don't apply or have been weighed and didn't change the outcome. This
document does not re-litigate them; if either factor changes materially in
the future (e.g. a pivot to a web-focused team), that would be grounds for
a new ADR superseding this one, not a reason to reopen this one now.

## Consequences

- The existing Electron scaffold (`src/main`, `src/preload`,
  `electron-builder.yml`, `electron.vite.config.ts`, etc.) is **fully
  retired, not adapted.** A new React Native project structure is created
  in a later implementation phase — not in this phase, since this remains
  an architecture-only pass.
- Capacitor is no longer under consideration. Any future architecture or
  implementation document that references platform-specific mechanics
  should assume React Native and should not maintain parallel
  Capacitor-compatible language "just in case" — that would reintroduce
  exactly the kind of unnecessary abstraction the project's "do the
  simplest thing" instruction warns against.
- The **Local Application Core** (matching engine, contract/reminder
  logic, backup orchestration) should still be written as plain,
  platform-agnostic TypeScript with a thin platform-adapter layer for
  storage/notifications/secure-storage access. This was already good
  practice regardless of which platform won; it remains good practice now
  because it keeps the core business logic testable in isolation, not
  because the platform question is still open.
- Native module selections that depend on this ADR (SQLite binding,
  SQLCipher integration, secure-storage wrapper, local-notification
  scheduling library) can now be selected against React Native
  specifically, rather than kept generic — this was the concrete blocker
  named in `/docs/architecture/unresolved-decisions.md` and in
  `04-final-architecture.md` §11's risk list; it is now cleared.

## Status of this decision

**FINAL.** Confirmed by the project owner in the Phase 4B pass. Recorded
here and in `/docs/changelog.md`'s corresponding dated entry, following
the same pattern used for every other product-owner decision in this
project.
