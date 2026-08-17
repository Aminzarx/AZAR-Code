# Phase 5 Decisions — Project Foundation

Status: RECORD OF IMPLEMENTATION-PHASE FINDINGS — per
`docs/implementation/implementation-roadmap.md`'s Phase 5 section, the
navigation library and the state/data-fetching approach were framed as
recommendations for Phase 5 to validate, not decisions the roadmap made
unilaterally. This document records what was actually chosen, why, and
what it costs — the roadmap's Phase 9/`unresolved-decisions.md` convention
for capturing implementation-phase findings, applied here for Phase 5.
Date: 2026-08-08

None of the choices below touch anything marked FINAL, PROPOSED-pending-
review, or OPEN in `docs/architecture/unresolved-decisions.md` (platform,
Android/Xiaomi floor, database technology, encryption, matching weights,
etc.). They are Phase 5's own tooling choices, made explicitly rather than
defaulted to silently.

---

## 1. Navigation: React Navigation

**Choice**: `@react-navigation/native` + `@react-navigation/native-stack`
(v7.x), backed by `react-native-screens` and
`react-native-safe-area-context`.

**Reason**: `implementation-roadmap.md`'s own Phase 5 section names React
Navigation as "the de facto standard for RN ... assumed here unless a
documented reason emerges to deviate." No such reason emerged — evaluated
against this project's actual requirements (gesture-heavy, one-handed UX;
RTL/Persian support; native-stack performance; a 44-screen navigation tree
arriving in Phase 12) and found no conflict.

**Pros**:
- Native-stack navigator renders through platform-native navigation
  primitives (via `react-native-screens`), not a JS-only stack —
  consistent with `ADR-001`'s reasoning for choosing React Native over
  Capacitor in the first place (shorter, more native-direct path).
- Built-in RTL support (`I18nManager`-aware) — directly relevant to this
  project's Persian/RTL-first requirement (`design-system.md` §3/§13).
- Large, actively maintained ecosystem; typed navigation (`RootStackParamList`)
  keeps route params checked under TypeScript strict mode.
- Well-documented Jest/testing story (with the caveat recorded in §4 below).

**Cons**:
- Adds `react-native-screens` and `react-native-gesture-handler` as native
  dependencies — more native surface than a JS-only navigator, and each
  is a Xiaomi-compatibility item to actually test in Phase 14 (§3 below),
  not just assume compatible.
- `react-native-screens`' native `Screen` primitives don't exist under
  Jest's JS-only test environment — required a test-harness workaround
  (§4), not a production concern but worth knowing before Phase 12 adds
  more navigation-dependent tests.

**Impact on future phases**: Phase 12 builds all 44 screens' routes on
top of this navigator; Phase 11's component library should assume
native-stack's header/screen-options API when building any custom header
or transition. No other phase depends on this choice directly.

---

## 2. State / data layer: TanStack Query, no global store library

**Choice**: `@tanstack/react-query` (v5.x) as the async data-fetching/
caching layer, with plain React state/props for pure UI state. **No**
global state-management library (Redux, Zustand, MobX, etc.) is adopted in
Phase 5.

**Reason**: `implementation-roadmap.md`'s Phase 5 section makes a specific
argument this project's own shape supports: "most of this application's
'state' is actually database state, not client state, so a heavy global-
store library ... is likely more machinery than this app needs." Nothing
built in Phase 5 changes that analysis — there is no cross-cutting client
state yet (no auth/session state exists until Phase 8). Adopting a global
store now, before a concrete need exists, would be exactly the kind of
premature abstraction the project's own engineering discipline warns
against.

**Pros**:
- TanStack Query maps directly onto Phase 6's future repository layer:
  each repository method becomes a query/mutation, with caching,
  loading/error states, and pagination support already built in — this is
  the same shape `ui-screen-mapping.md` already expects every list/detail
  screen to have (Loading/Empty/Error/Success columns).
- Zero cross-cutting global state to reason about in Phase 5, when no
  feature that would need one exists yet.
- Small, focused dependency (no reducers, no action-type boilerplate).

**Cons / risk accepted**:
- Phase 8 (Authentication) will need *some* mechanism to share session
  state (is the user authenticated) across the navigation tree. This
  document deliberately does not pre-decide that mechanism — plain React
  Context is the likely candidate given the roadmap's stated preference
  for "React's built-in state for pure UI state," but that is Phase 8's
  decision to make with Phase 8's actual requirements in front of it, not
  this phase's to guess.
- If a genuine cross-cutting client-state need is found before Phase 8
  (unlikely, given Phase 5-7 have no UI beyond the placeholder screen),
  revisit this decision explicitly rather than reaching for a store
  library reflexively.

**Impact on future phases**: Phase 6's repository layer should expose
methods shaped for direct use as TanStack Query query/mutation functions
(return a promise, throw on error, accept a typed input). Phase 8 makes
its own, separate decision about session-state sharing.

---

## 3. Dependency API 26 / Xiaomi compatibility check (Phase 5 dependencies only)

| Dependency | API 26 check | Xiaomi note |
|---|---|---|
| `react-native@0.86.2` | Official minimum floor is below API 26; project's own `minSdkVersion=26` governs the build. | New-architecture (Fabric/TurboModules) is enabled by default in this template — this is the RN default as of this version, not a Phase 5-specific choice; no Xiaomi-specific new-architecture issue is currently documented against this RN version. |
| `react-native-screens@4.27.0` | Reads `minSdkVersion` from the root project's `ext` block (confirmed: inherits the project's 26, does not impose its own lower or higher floor). | No currently-documented Xiaomi-specific incompatibility. Native-stack screens are exactly the navigation primitive Phase 14's Xiaomi lifecycle/process-recreation testing must exercise — flagged for that phase, not resolved here. |
| `react-native-gesture-handler@3.1.0` | Same `ext`-inherited `minSdkVersion` mechanism (own default floor is 24, below the project's 26 — no conflict). | No currently-documented Xiaomi-specific incompatibility. |
| `react-native-safe-area-context@5.8.1` | Same `ext`-inherited mechanism (own default floor is 16). | No currently-documented Xiaomi-specific incompatibility. |
| `@react-navigation/native@7.3.16`, `@react-navigation/native-stack@7.18.8` | Pure JavaScript, no native Android/iOS code of their own — inherits whatever floor `react-native-screens`/`react-native` set. | Not applicable (no native surface). |
| `@tanstack/react-query@5.101.4` | Pure JavaScript, no native code. | Not applicable. |

**Not yet verified (explicitly out of Phase 5's scope, flagged forward)**:
real-device Xiaomi behavior for any of the above — per `ADR-010`,
"successful compilation is NOT evidence of Xiaomi compatibility." This
table confirms *build-time* compatibility only (no minSdkVersion conflict,
no known incompatibility documented anywhere Phase 5 could find). Real
Xiaomi-device verification of navigation/gesture behavior happens in
Phase 14's compatibility matrix, as scoped by the roadmap — Phase 5 does
not claim more than it has actually tested.

---

## 4. Known tooling friction found during Phase 5 (recorded, not silently worked around)

Rendering the full app (React 19 + React Navigation v7 + `react-native-
screens`) under Jest required two non-obvious fixes, recorded here so a
later phase doesn't waste time rediscovering them:

1. `react-native-screens`' native `Screen` component doesn't exist under
   Jest's JS-only environment — `enableScreens(false)` is called in
   `jest.setup.js` for the test run only; this has no effect on the real
   app, which always runs with native screens enabled.
2. `react-native-safe-area-context`'s own published Jest mock
   (`react-native-safe-area-context/jest/mock`) re-exports its
   replacement under a `default` property (an ESM-interop artifact of how
   that package is built). Used as-is via `jest.mock(...)`, this leaves
   named imports the mock doesn't re-export at its top level — such as
   `SafeAreaInsetsContext`, which `@react-navigation/elements` imports by
   name — silently `undefined` at test time, which surfaces as a
   confusing "Element type is invalid" React error with no obvious cause.
   `jest.setup.js` works around this by spreading `mock.default` onto the
   mock's own top level before handing it to `jest.mock`. This is a
   test-harness-only fix; it does not change any production code path.

Neither of these affects `npm run typecheck`, `npm run lint`, or the real
app on-device — both are specific to making `@testing-library/react-native`
render the full navigation tree under Node.
