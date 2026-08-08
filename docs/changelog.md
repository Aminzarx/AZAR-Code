# Changelog

Architectural and product decisions are recorded here as they are made, per the
documentation rule in PRODUCT.md. This is a decision log, not a release changelog —
entries exist even before any code ships.

---

## 2026-08-08 — Phase 0 discovery

**Change**: Created `/docs/00-project-overview.md` documenting the current
repository state (bare Electron/React/TS scaffold, no product code).

**Reason**: PRODUCT.md requires repository inspection and documentation before any
implementation.

**Affected modules**: None (documentation only).

**Migration requirements**: None.

**Tests**: None yet.

---

## 2026-08-08 — Confirmed decision: target platform is a real mobile app

**Change**: Confirmed the application will be built as a genuine mobile app (React
Native or Capacitor, to be finalized in Phase 3), not the existing Electron desktop
scaffold.

**Reason**: PRODUCT.md's mobile-first, one-handed-use, OTP-by-mobile-number, and
offline-resilience requirements are incompatible with a desktop shell. Flagged as
an open question in Phase 0; resolved by the project owner.

**Affected modules**: Application shell/platform (all future UI, navigation, and
native-capability work). The current `src/main`, `src/preload`,
`src/renderer` Electron scaffold is not the foundation going forward.

**Migration requirements**: Full platform migration in a future implementation
phase; not started yet.

**Tests**: N/A (no code changed).

---

## 2026-08-08 — Confirmed decision: OTP/SMS provider to be proposed in Phase 3

**Change**: No SMS/OTP provider is mandated. Phase 3 architecture must propose a
concrete provider and backend approach for project-owner confirmation.

**Reason**: Avoids hard-coding a vendor decision before backend architecture is
designed; keeps referral/OTP server-side validation requirements (PRODUCT.md
Authentication section) intact regardless of provider.

**Affected modules**: Authentication/backend (future).

**Migration requirements**: None yet.

**Tests**: N/A.

---

## 2026-08-08 — Confirmed decision: matching engine must be deterministic and AI-independent

**Change**: The core matching engine MUST NOT depend on any external AI API or
paid AI service. The first production version must be a deterministic, rule-based,
configurable scoring engine operating on structured fields, supporting priority
levels (MUST_HAVE, IMPORTANT, PREFERRED, IGNORE), hard constraints, exclusions,
numeric ranges, exact/approximate values, locations, amenities, preferences, and
weighted scoring, with a fully explainable result (matched/mismatched/ignored
criteria, critical requirements). AI, if introduced later, is strictly an optional
enhancement layer (e.g. natural-language input → structured, user-confirmed
requirements → deterministic engine) and must never sit in the critical path of
producing a match score. The application must remain fully functional with zero AI
API configured, at every phase.

**Reason**: Explicit project-owner directive, given in advance of Phase 1, to
prevent this constraint from being violated by any future architecture or
implementation decision. Recorded before Phase 1 begins so it binds all subsequent
requirements, user stories, architecture, database schema, and matching-engine
design.

**Affected modules**: Matching engine (core), requirement/criterion data model
(database design, Phase 4), future `/docs/matching/*.md` docs, any future
natural-language-input feature (must be built as an optional pre-processing layer
only).

**Migration requirements**: None yet — no matching engine code exists. This
decision constrains its initial design; there is no migration away from an
AI-dependent version because one was never built.

**Tests**: To be defined in `/docs/testing/test-plan.md` and
`/docs/matching/*.md` — matching engine tests must validate deterministic behavior
without any AI dependency, including edge cases such as "pool is essential, ignore
price/area/bedrooms."
