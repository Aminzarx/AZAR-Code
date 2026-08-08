# UX Dependencies

Status: DRAFT — Phase 3. The UI/UX has **not** been designed yet; Stitch
designs will be provided before production implementation. This document
identifies which architectural decisions depend on that future UI design, so
Phase 3 does not silently invent screens or navigation to fill the gap.
Date: 2026-08-08

## Principle

Every architecture document in this Phase 3 set has been written to avoid
assuming specific screens, navigation structure, or interaction patterns
beyond what Phase 1 §16 (UX Requirements) already confirmed at a product
level (one-handed use, loading/empty/error/offline states, autosave,
destructive-action confirmation, etc.). Where a document above touches
something UI-shaped, it is flagged **[UX-dependent]** inline and repeated
here for visibility.

## Decisions that depend on the UX design (consolidated)

| Area | What's architecturally ready now | What waits for Stitch designs |
|---|---|---|
| Migration-time backup prompting (local-data-architecture.md) | Requirement that a migration must be transactional/rollback-safe | Whether/how the app prompts the user to back up before an update that migrates the schema |
| Backup export destination (backup-architecture-analysis.md) | Requirement that the app doesn't manage a cloud destination itself | Whether export uses a native share sheet, an in-app file picker, or another pattern |
| Backup password/key entry, clipboard handling (threat-model.md) | Requirement that secrets aren't logged/exposed carelessly | Whether a "copy password" convenience is offered at all, and how |
| App-switcher/screenshot obscuring (threat-model.md) | Requirement to consider it for screens showing PII | Which screens actually show sensitive-enough data to warrant it |
| Notification-permission-denied guidance (notification-architecture.md) | Requirement that in-app history is the fallback regardless of permission state | How/whether the app prompts the user to fix permissions in Settings |
| Session-lifecycle background re-validation UX (authentication-otp-architecture.md) | Requirement that it never blocks offline use | Any user-visible indication of session state/re-validation, if any is even shown |
| Restore-onto-existing-data behavior (backup-architecture-analysis.md, RST-05) | Requirement that it's staged/rollback-safe either way | Whether the resolution is "block with a confirmation dialog" or another pattern — this is as much a UX decision as a technical one |
| Match explanation presentation (matching-architecture.md) | Requirement that matched/mismatched/ignored/critical are always available as structured data | How that structured data is laid out/visualized on screen |
| Reminder-offset-in-the-past-for-existing-contracts behavior (notification-architecture.md) | The data-layer mechanism (unique constraint) is decided | Whether the user is asked/informed when this happens |

## Navigation/state requirements that should wait for UI design

- **Screen inventory and navigation graph**: not defined in this Phase 3 set
  by design — Phase 1 §16 established *behavioral* navigation requirements
  (predictable back-navigation, minimal taps) but not a specific screen list,
  which belongs to the Stitch design phase, not to architecture documents
  written ahead of it.
- **State management library/pattern** (e.g. how UI-layer state is organized
  relative to the Local Application Core): this document deliberately leaves
  it unaddressed. The architecture overview's component diagram treats "UI
  Layer" as a black box specifically so this doesn't get pre-decided based on
  guessed screens.
- **Form/data-entry component design** for structured criteria entry (chips,
  priority selectors, etc., per Phase 1 §16's "minimal data entry" guidance)
  — the *data* those components must produce (a RequirementCriterion with a
  priority) is fixed by the conceptual data model; the *component design*
  itself is explicitly a Stitch-design concern.

## What this document is not

- Not a screen list, not a navigation map, not a component inventory, not a
  visual design. All of that is intentionally deferred.
- Not a reason to leave the underlying data/logic architecture vague — every
  other Phase 3 document is written to be fully decidable (or explicitly
  flagged as pending a *technical*, not UX, decision) without needing to know
  what the screens look like. This document exists to make that boundary
  explicit, not to use "waiting for UX" as an excuse to under-specify
  something that didn't actually depend on it.

## Process note

Once Stitch UI/UX designs are provided, this document should be revisited to
resolve each row in the table above against the actual designs, before
implementation begins on the affected areas.
