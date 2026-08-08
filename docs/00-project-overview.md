# 00 — Project Overview (Phase 0 Discovery)

Status: DRAFT — Phase 0 findings reviewed; confirmed decisions recorded in §2a.
Phase 1 (product requirements) not yet started, pending final project-owner
go-ahead.
Date: 2026-08-08 (updated)

## 2a. Confirmed Project Decisions

These decisions have been made by the project owner and supersede the open
questions raised in the original Phase 0 draft. They are binding constraints on
every subsequent phase (requirements, user stories, architecture, database,
matching engine, security, testing).

### Decision 1 — Target platform: real mobile app

The application will be built as a genuine mobile app (React Native or
Capacitor — to be finalized in Phase 3 architecture), **not** a desktop
Electron app. The existing Electron/React/TS scaffold does not match this
direction and will need to be replaced; nothing in it should be treated as
load-bearing for the CRM itself. OTP/SMS-based registration, offline
resilience, and one-handed mobile UX (per PRODUCT.md) are first-class
requirements, not stretch goals.

### Decision 2 — OTP/SMS provider: to be designed/recommended

No SMS/OTP provider is mandated yet. Phase 3 architecture must propose a
concrete provider and backend approach (e.g., a small auth service fronting an
SMS gateway) for project-owner confirmation before implementation begins.
Referral-code validation must happen server-side regardless of provider choice
(per PRODUCT.md's authentication requirements).

### Decision 3 — Matching engine must be deterministic and AI-independent (critical)

**The core matching engine MUST NOT depend on any external AI API or paid AI
service.** This is a hard architectural constraint, not a preference:

- The first production version must be a **deterministic, rule-based,
  configurable scoring engine** operating on structured fields — not an LLM
  call, not a hosted AI matching API, not a "black box" score.
- The engine must support priority levels **MUST_HAVE, IMPORTANT, PREFERRED,
  IGNORE** per requirement criterion (already specified in PRODUCT.md's
  Matching Engine section — now confirmed as the actual design, not just an
  example).
- The engine must support: hard constraints, exclusions, numeric ranges, exact
  values, approximate values, locations, amenities, preferences, and weighted
  scoring — all evaluated deterministically from structured data.
- Every match result must be explainable: matched criteria, mismatched
  criteria, ignored criteria, and critical (MUST_HAVE) requirements must all be
  surfaced to the user, with no unexplained aggregate score.
- **AI is explicitly out of scope for the core engine.** If AI is introduced
  later, it may only be an *optional enhancement layer* sitting in front of the
  deterministic engine — e.g. converting free-text natural-language applicant
  input into structured, user-confirmed requirements, which are then scored by
  the same deterministic engine. AI must never be in the critical path of
  producing a match score itself.
- **The application must remain fully functional with zero AI API
  configured** — no degraded mode, no missing core feature, no matching-quality
  cliff when AI is absent. This must hold true at every phase of
  implementation, not just at "launch."

Implication for later docs: `/docs/matching/matching-engine.md`,
`/docs/matching/scoring.md`, `/docs/matching/priorities.md`, and
`/docs/matching/natural-language-rules.md` (Phase-appropriate, created later)
must all be written against this constraint. `natural-language-rules.md`
specifically must document natural language as an **optional, replaceable
input-normalization step**, never a dependency of the scoring algorithm.
Implication for architecture (Phase 3) and database design (Phase 4): the
requirement/criterion data model must be rich enough to represent priority
levels, ranges, exact/approximate matching, and exclusions natively — there is
no fallback to "let the AI figure it out" if the schema is under-specified.

## 1. Purpose

This document records the state of the repository as inspected at the start of the
"AZAR CRM" engagement, before any product code is written. Per the governing
instructions (PRODUCT.md), no large-scale implementation may begin until this
analysis is reviewed by the project owner.

## 2. Repository Inventory

```
.
├── build/                     electron-builder resources (entitlements, icons)
├── resources/                 app icon
├── src/
│   ├── main/index.ts           Electron main process (window bootstrap only)
│   ├── preload/index.ts        contextBridge exposing @electron-toolkit/preload API
│   ├── preload/index.d.ts      global Window typing for the above
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx        React root mount
│           ├── App.tsx         Boilerplate "Hello World" screen (electron-vite starter)
│           ├── components/Versions.tsx   Displays Electron/Chromium/Node versions
│           ├── assets/*.css, *.svg
│           └── env.d.ts
├── electron-builder.yml       Packaging config (Windows/macOS/Linux desktop targets)
├── electron.vite.config.ts    Build config (main/preload/renderer, React plugin)
├── package.json                Deps: electron, react 19, react-dom 19, typescript, vite
├── tsconfig*.json
├── eslint.config.mjs, .prettierrc.yaml
└── README.md                   Default electron-vite README
```

Single commit in history: "Initial project setup" (the unmodified `electron-vite`
React-TS scaffold, generated by `npm create @quick-start/electron`). No application
code, no tests, no CI configuration, no `.env` handling, no docs exist yet.

## 3. Current Architecture

- **Shell**: Electron 43 desktop application (three-process model: main, preload,
  renderer).
- **Renderer**: React 19 + TypeScript, bundled by `electron-vite`/Vite 7. No router,
  no state library, no UI kit — just a single static component tree.
- **Main process**: Creates one `BrowserWindow` (900×670), no menu customization
  beyond `autoHideMenuBar`, one demo IPC channel (`ping` → logs `pong`).
- **Preload**: Exposes `window.electron` (from `@electron-toolkit/preload`) and an
  empty `api` object via `contextBridge`. `sandbox: false` is set on
  `webPreferences` (see Security §7).
- **Packaging**: `electron-builder.yml` targets Windows (NSIS), macOS (DMG, with
  camera/mic/Documents/Downloads usage strings pre-declared but unused), and Linux
  (AppImage/snap/deb). Auto-update publish endpoint points at a placeholder
  `https://example.com/auto-updates`.

## 4. Technology Stack (as found)

| Layer | Technology | Notes |
|---|---|---|
| Shell | Electron 43.1.1 | Desktop only (Win/macOS/Linux) |
| UI | React 19.2, TypeScript 5.9 | No routing/state libs installed |
| Build | Vite 7 via `electron-vite` | |
| Styling | Plain CSS (`base.css`, `main.css`) | No design system |
| Lint/format | ESLint 9 (flat config) + Prettier | Configured, not yet applied to any real code |
| Database | **None** | No SQLite/IndexedDB/ORM present |
| Auth | **None** | |
| Networking | **None** | No HTTP client, no API layer |
| Notifications | **None** | |
| Testing | **None** | No test runner installed (no Jest/Vitest/Playwright) |
| CI/CD | **None** | No `.github/workflows` |

## 5. Existing Modules

There are no product modules. The only "feature" present is the electron-vite
starter's demo screen (logo, IPC ping/pong button, version display). This is
disposable scaffolding, not a foundation to build the CRM on top of architecturally
— but the Electron/Vite/React/TS toolchain itself is a reasonable base to keep if
the platform decision (§9) confirms a desktop app is in fact wanted.

## 6. Known Problems / Technical Debt

1. No real application code exists — this is Phase 0 of a greenfield build, not a
   refactor.
2. `sandbox: false` in `webPreferences` (`src/main/index.ts`) disables Chromium's
   renderer sandbox — a meaningful security regression from Electron defaults that
   has no justification in the current code (no native module needs it yet).
3. `electron-builder.yml` declares camera/microphone/Documents/Downloads macOS
   usage-description entitlements that are unused — will trigger unnecessary
   permission prompts and App Store review questions if shipped as-is.
4. Auto-update `publish.url` is a placeholder (`example.com`) — not wired to any
   real distribution channel.
5. No `.env`/secrets handling convention exists yet — must be established before
   any credentials (SMS/OTP provider keys, etc.) are introduced.
6. No test runner, no CI — nothing currently enforces the build on commit/PR.

## 7. Security Findings (current state)

- `sandbox: false` on the renderer (see §6.2) — should be re-enabled unless a
  concrete native-module requirement forces disabling it, and if disabled, the
  reason must be documented.
- `contextIsolation` is implicitly on (Electron 43 default) and preload correctly
  uses `contextBridge` — this part follows current Electron best practice.
- `shell.openExternal` is wired to all target="_blank" link clicks via
  `setWindowOpenHandler` — acceptable pattern, but must be revisited once the app
  renders any user-supplied or remote content (XSS → arbitrary `shell.openExternal`
  risk).
- No CSP is set on the renderer `index.html`.
- No secret material exists yet in the repo (`.gitignore` correctly excludes
  `node_modules`, `dist`, `out`, `.log*`; no `.env` present).

## 8. Performance / UX Findings

- Not yet applicable — no real UI exists. Baseline startup is the stock Electron
  cold-start (~unoptimized, single window, no code-splitting configured beyond
  Vite defaults).
- No offline story, no local persistence, no loading/error/empty states anywhere.

## 9. Resolved Assumptions (formerly open questions)

The gap identified in the original Phase 0 draft between PRODUCT.md's mobile-first
language and the Electron desktop scaffold has been resolved by the project owner:
see **Decision 1** in §2a. The app will be a real mobile app; the current Electron
scaffold will not be the foundation going forward.

OTP/SMS provider selection was also open; see **Decision 2** in §2a — Phase 3
architecture must propose an approach for confirmation, rather than defaulting to
any specific vendor.

The matching engine's dependence (or non-dependence) on AI was not raised in the
original draft as an open question but has since been settled explicitly and
strongly: see **Decision 3** in §2a. It is now a hard constraint carried into every
later phase, not a recommendation.

## 10. Recommended Architecture (updated for confirmed decisions)

Full detail belongs in `/docs/architecture/system-architecture.md` (Phase 3). At a
high level, informed by §2a:

- **Shell**: React Native (or Capacitor) mobile app, replacing the Electron
  scaffold. Final framework choice to be justified in Phase 3 against the "fast,
  offline-resilient, one-handed" requirements.
- **Local storage**: on-device database (e.g. SQLite via a mobile-appropriate
  driver) as the source of truth for offline-first behavior, syncing outward where
  applicable.
- **Auth/OTP**: thin backend service validating mobile number + OTP + referral code
  server-side, fronting an SMS gateway (provider TBD per Decision 2).
- **Matching engine**: a self-contained, deterministic, rule-based scoring module
  with zero runtime dependency on any AI API (Decision 3). It must be designed and
  testable in complete isolation from the mobile app shell and from any network
  connectivity, since it operates purely on locally stored structured data.
  Natural-language input parsing (if built) is a strictly optional, separable
  pre-processing step feeding the same structured requirement schema a user can
  edit by hand.

The prior Electron scaffold is no longer treated as a foundation; whether any of
its tooling choices (Vite, ESLint config, TypeScript conventions) carry over to the
mobile stack is a Phase 3 decision, not assumed here.

## 11. Risks Carried Forward

- Replacing the desktop scaffold with a mobile stack is a larger initial lift than
  continuing on Electron would have been — expected and accepted per Decision 1,
  but worth naming as the cost of the corrected direction.
- The matching engine's data model (priorities, ranges, exact/approximate
  matching, exclusions) must be fully specified in Phase 4 database design — there
  is no AI fallback to compensate for an under-specified schema (Decision 3), so
  errors here are more consequential than they would be in an AI-assisted design.
- No CI/tests currently gate changes — as soon as real code lands, a test runner
  and a minimal CI workflow should be introduced early, not deferred. The matching
  engine in particular needs extensive deterministic edge-case tests (PRODUCT.md
  Testing section), which is easier to guarantee given it has no AI-induced
  nondeterminism to account for.
- No secrets-management convention exists — must be defined before OTP
  provider keys or encryption keys are introduced (Phase: Security/Backup docs).

## 12. Next Steps

Per PRODUCT.md, Phase 0 documentation is created first. Platform, OTP-approach, and
matching-engine-determinism decisions are now confirmed (§2a) and will constrain
Phases 1-4 and the security/matching/backup docs once they begin. Per explicit
instruction, **implementation has not started** and Phase 1 (product requirements)
will not begin until the project owner gives further approval.
