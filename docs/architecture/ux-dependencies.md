# UX Dependencies

Status: DRAFT — Phase 3, revised after project-owner review. The UI/UX has
**not** been designed yet; Stitch designs will be provided before production
implementation. This document identifies which architectural decisions depend
on that future UI design, distinguishing three categories for every area
evaluated: decisions that can be finalized now (independent of UI), decisions
that are architecturally ready but whose *presentation* waits for Stitch, and
decisions that genuinely cannot be made until the UI design exists.
Date: 2026-08-08 (revised)

## Classification key

- **FINALIZE NOW** — no UI dependency; this can and should be settled at the
  architecture/data level without waiting for Stitch.
- **WAIT FOR STITCH** — the underlying data/logic can be architected now, but
  the actual behavior, layout, or interaction pattern depends on decisions
  the UI design will make, and must not be guessed here.
- **INDEPENDENT OF UI** — genuinely orthogonal to what the screens look like;
  listed to make clear it does *not* belong in the "wait for Stitch" bucket
  even though it's adjacent to areas that do.

## Evaluated areas

### Navigation architecture — **WAIT FOR STITCH**
The screen inventory and navigation graph (what screens exist, how they
connect) cannot be defined without the Stitch designs. What *can* be fixed
now: Phase 1 §16's behavioral requirements (predictable back-navigation,
minimal taps, one-handed reachability of primary actions) constrain whatever
navigation structure Stitch proposes, but do not themselves constitute a
navigation architecture.

### One-handed interaction — **WAIT FOR STITCH, with a FINALIZE NOW constraint**
The specific layout (thumb-reach zones, bottom-anchored primary actions,
gesture zones) is a Stitch-design decision. **FINALIZE NOW**: the underlying
requirement itself (Phase 1 §16 — primary actions reachable one-handed) is
already confirmed and does not change; it's a constraint Stitch designs
against, not a decision Stitch makes from scratch.

### Form architecture — **WAIT FOR STITCH, with FINALIZE NOW data underneath**
**FINALIZE NOW**: the *data* every form must produce is already fixed by
Phase 1 §7/§8 and the conceptual data model — structured fields, priority
tags (MUST_HAVE/IMPORTANT/PREFERRED/IGNORE) per criterion, restrictions
distinct from criteria, free-form/internal notes kept separate. **WAIT FOR
STITCH**: the actual component design (chips vs. dropdowns vs. sliders for
priority selection, single-screen vs. multi-step/progressive-disclosure
forms, autocomplete presentation) is entirely a UI decision layered on top of
that fixed data shape.

### Shared owner/applicant fields — **FINALIZE NOW**
This is architecturally independent of UI: Phase 1 already confirmed owner
and applicant files "share a consistent data-entry philosophy" with reusable
structured fields (property type, location, price, amenities, etc.) and the
conceptual data model already models Amenity/Location as shared, reusable
entities referenced by both file types. Whether the *form component* is
visually shared between the two file types is a Stitch decision, but the
*data-model-level* sharing is settled now and does not need to wait.

### Search and filtering — **INDEPENDENT OF UI (mostly), WAIT FOR STITCH (presentation)**
**INDEPENDENT OF UI**: the query/index architecture
(`/docs/local-data/local-data-architecture.md`) — what fields are searchable,
how filtering maps to indexed queries — is fully specified without knowing
what the search screen looks like. **WAIT FOR STITCH**: result presentation
(list vs. grouped-by-type, filter-chip UI, saved-filter management UI).

### Matching workflow — **INDEPENDENT OF UI (engine), WAIT FOR STITCH (entry points)**
**INDEPENDENT OF UI**: the four-stage matching pipeline
(`/docs/matching/matching-architecture.md`) is a pure data/logic concern and
is already architected without any UI dependency — this is deliberate, so the
engine remains testable in isolation regardless of what the UI ends up being.
**WAIT FOR STITCH**: where/how a user triggers a match run, and how results
are browsed (list, ranked cards, etc.).

### Match explanation presentation — **WAIT FOR STITCH, with FINALIZE NOW data underneath**
**FINALIZE NOW**: the structured explanation data (matched/mismatched/
ignored/critical criteria, per the matching architecture doc's Stage 4) is
fully specified and must exist as structured output regardless of how it's
displayed — this is the non-negotiable part (Phase 0 Decision 3: no
unexplained score). **WAIT FOR STITCH**: the visual layout of that
explanation (expandable sections, a criteria checklist, a score breakdown
chart, etc.) is entirely presentational.

### Contract workflow — **WAIT FOR STITCH, with FINALIZE NOW data/logic underneath**
**FINALIZE NOW**: contract creation fields, status transitions, history
retention, and the reminder-generation logic that hangs off contract state
(`/docs/notifications/notification-architecture.md`) are all settled at the
data/logic layer. **WAIT FOR STITCH**: how contract status is edited/
visualized, how history is browsed.

### Reminder management — **WAIT FOR STITCH, with FINALIZE NOW data/logic underneath**
**FINALIZE NOW**: the default 90/60/30/14/7/3/0-day schedule, its
configurability, and the idempotency mechanism are settled
(`/docs/notifications/notification-architecture.md`). **WAIT FOR STITCH**:
how a user views/configures the schedule, and how a fired reminder is
marked "handled."

### Backup/export/import UX — **WAIT FOR STITCH, with FINALIZE NOW architecture underneath**
**FINALIZE NOW**: the backup format's required structure, the validation
ordering, and the requirement that the app doesn't manage a cloud destination
itself (`/docs/backup/backup-architecture-analysis.md`) are all settled.
**WAIT FOR STITCH**: whether export uses a native share sheet vs. an in-app
file picker, and how backup password entry is presented (this also feeds the
clipboard-risk consideration in the threat model — the risk is named now,
the actual UI decision waits).

### Restore workflow — **WAIT FOR STITCH, with FINALIZE NOW architecture underneath**
**FINALIZE NOW**: the validation ordering (format → integrity → key → version)
and the staged/rollback-safe restore mechanism are settled. **WAIT FOR
STITCH**: the specific UI for the still-open restore-onto-existing-data
question — this document previously listed the *policy* (block vs. overwrite)
as pending; it is now clear that even once that policy is chosen, its
presentation (a confirmation dialog, a diff/preview screen, etc.) is Stitch's
call, not architecture's.

### Offline states — **FINALIZE NOW (classification), WAIT FOR STITCH (presentation)**
**FINALIZE NOW**: `/docs/01-product-requirements.md` §4a already classifies
every workflow as OFFLINE/ONLINE_REQUIRED/ONLINE_OPTIONAL, and Phase 2's
OFF-03 already establishes the *behavioral* rule (no blanket "degraded"
banner; scoped messaging only on ONLINE_REQUIRED actions attempted offline).
**WAIT FOR STITCH**: the actual visual treatment of an offline/
connectivity-required state.

### Loading states — **INDEPENDENT OF UI (when they occur), WAIT FOR STITCH (how they look)**
**INDEPENDENT OF UI**: because nearly all workflows are OFFLINE (local
database reads), genuine loading states should be rare and short — this is
an architectural consequence of local-first, not a UI decision. Where a
loading state is still needed (e.g. a large query, or the ONLINE_REQUIRED
auth flow), *that* is fixed now. **WAIT FOR STITCH**: skeleton-loading visual
design (Phase 1 §16 already requires skeleton loading over generic spinners
as a pattern, but not its specific look).

### Empty states — **WAIT FOR STITCH**
Which screens need an empty state and what each one says (e.g. "no matches
yet — try adjusting requirements" vs. "no properties yet — add your first
file") depends on the screen inventory, which doesn't exist yet.

### Error states — **INDEPENDENT OF UI (taxonomy), WAIT FOR STITCH (presentation)**
**INDEPENDENT OF UI**: the *categories* of error this product must handle are
already fixed by the architecture — NETWORK FAILURE vs. AUTHENTICATION
FAILURE (auth doc), backup wrong-key vs. corrupted vs. incompatible-version
(backup doc), validation errors, transient/retryable errors (Phase 1 §16,
ERR-01/ERR-02). **WAIT FOR STITCH**: how each category is visually
represented.

### Destructive action confirmation — **FINALIZE NOW (requirement), WAIT FOR STITCH (mechanism)**
**FINALIZE NOW**: Phase 1 §4 already confirms destructive operations (delete
file, delete contract, restore-overwriting-data) always require explicit
confirmation, and never redundantly for safe/reversible actions. **WAIT FOR
STITCH**: whether that's a modal dialog, a bottom sheet, a swipe-then-confirm
pattern, etc.

### Notification permission UX — **WAIT FOR STITCH, with FINALIZE NOW fallback logic underneath**
**FINALIZE NOW**: `/docs/notifications/notification-architecture.md` already
establishes that the in-app notification history is authoritative regardless
of OS-level permission state — a user is never solely dependent on catching a
permission-gated local notification. **WAIT FOR STITCH**: whether/how the app
proactively prompts a user to fix denied permissions (e.g. a banner directing
to Settings).

## Summary table

| Area | Classification |
|---|---|
| Navigation architecture | WAIT FOR STITCH |
| One-handed interaction | WAIT FOR STITCH (requirement: FINALIZE NOW) |
| Form architecture | WAIT FOR STITCH (data: FINALIZE NOW) |
| Shared owner/applicant fields | FINALIZE NOW |
| Search and filtering | INDEPENDENT OF UI (query layer) / WAIT FOR STITCH (presentation) |
| Matching workflow | INDEPENDENT OF UI (engine) / WAIT FOR STITCH (entry points) |
| Match explanation presentation | WAIT FOR STITCH (data: FINALIZE NOW) |
| Contract workflow | WAIT FOR STITCH (data/logic: FINALIZE NOW) |
| Reminder management | WAIT FOR STITCH (data/logic: FINALIZE NOW) |
| Backup/export/import UX | WAIT FOR STITCH (architecture: FINALIZE NOW) |
| Restore workflow | WAIT FOR STITCH (architecture: FINALIZE NOW) |
| Offline states | FINALIZE NOW (classification) / WAIT FOR STITCH (presentation) |
| Loading states | INDEPENDENT OF UI (when) / WAIT FOR STITCH (how) |
| Empty states | WAIT FOR STITCH |
| Error states | INDEPENDENT OF UI (taxonomy) / WAIT FOR STITCH (presentation) |
| Destructive action confirmation | FINALIZE NOW (requirement) / WAIT FOR STITCH (mechanism) |
| Notification permission UX | WAIT FOR STITCH (fallback logic: FINALIZE NOW) |

## What this document is not

- Not a screen list, not a navigation map, not a component inventory, not a
  visual design. All of that is intentionally deferred to Stitch.
- Not a reason to leave underlying data/logic architecture vague — every
  "FINALIZE NOW" row above is exactly that: settled, not blocked on UI, and
  should not be re-opened once Stitch designs arrive. The "WAIT FOR STITCH"
  rows are the ones genuinely blocked.

## Process note

Once Stitch UI/UX designs are provided, this document should be revisited to
resolve each "WAIT FOR STITCH" row against the actual designs, before
implementation begins on the affected areas. The revised implementation order
in `/docs/architecture/00-architecture-overview.md` places Stitch design and
review explicitly before "finalize architecture decisions affected by the
approved UX" for exactly this reason.
