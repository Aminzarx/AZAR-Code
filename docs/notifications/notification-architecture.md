# Notification & Reminder Architecture

Status: DRAFT — Phase 3 architectural analysis. Covers contract expiration
tracking, reminder scheduling, and local notification delivery. No code
written; no scheduling library selected.
Date: 2026-08-08

## Constraints carried in

**[CONFIRMED]** Reminders use local device notifications, not push (Phase 0
Decision 4). Reminder scheduling and expiration calculations are OFFLINE —
computed entirely from local contract data (§4a). Default schedule: 90, 60,
30, 14, 7, 3 days before expiration, and the expiration day itself
(configurable). Idempotent — a background job running twice must never
produce a duplicate reminder (Phase 1 §12, REM-03).

## Expiration calculation

- A contract's remaining-time-to-expiration is a pure function of its stored
  expiration date and the device's current date/time — no external input
  required, consistent with the OFFLINE classification.
- **[OPEN-ARCH]** Recalculation trigger: whether expiration/reminder-due
  status is recomputed continuously (e.g. on every app open) or via a
  scheduled background evaluation (see "Reminder scheduling" below) is an
  implementation-phase detail; both are consistent with the architecture as
  long as the *stored* reminder records (see idempotency below) are the
  actual source of truth for "was this reminder already generated," not a
  live recomputation each time.

## Reminder scheduling — conceptual model

```
For each active contract:
  For each configured offset (default: 90/60/30/14/7/3/0 days):
    target_date = contract.expiration_date − offset
    IF today >= target_date
       AND contract.status NOT IN (renewed, ended)
       AND no Reminder record exists for (contract_id, offset):
         → create Reminder record (contract_id, offset, generated_at)
         → schedule/fire local notification for it
```

- **Idempotency mechanism**: the existence check on `(contract_id, offset)` is
  the entire idempotency guarantee (REM-03). This must be enforced at the
  data layer — a unique constraint on `(contract_id, offset)` in the
  conceptual `Reminder` entity (see conceptual data model doc) — not merely
  as an application-level "check then insert," which is vulnerable to a race
  if the evaluation runs twice concurrently (e.g. an app-open trigger and a
  background trigger overlapping). A unique constraint makes the second
  insert attempt fail safely rather than succeed and duplicate.
- **Rescheduling**: if the reminder schedule configuration changes (Phase 1
  §12, REM-02), the evaluation logic above naturally picks up the new offset
  set going forward; **[CONFIRMED, Phase 2 REM-02]** already-fired reminders
  are unaffected by a later schedule change — the unique-constraint model
  above supports this automatically, since past `Reminder` records for
  now-removed offsets simply remain as history, and newly-added offsets are
  evaluated against `today` going forward without retroactively firing for
  dates already past (an explicit **[OPEN-ARCH]** design choice worth
  flagging: should adding a new, smaller offset that's already in the past
  relative to today fire immediately, or only apply to future contracts? —
  carried to unresolved decisions).

## Local notifications

- **[CONFIRMED]** Delivered via the OS's local notification scheduling
  capability, not a push service — no server round-trip, no dependency on
  the account/referral backend at all.
- **Architectural shape**: reminder generation (above) and local notification
  *scheduling* are conceptually two steps — generating the `Reminder` record
  is the durable, idempotent source of truth; scheduling the actual OS-level
  local notification for it is a delivery mechanism that could in principle
  be re-scheduled (e.g. after a device restart, see below) without
  re-generating or duplicating the underlying `Reminder` record.

## Duplicate prevention

- Covered above (unique constraint on `(contract_id, offset)`). Extends to
  the notification-scheduling layer too: scheduling a local notification for
  a `Reminder` that already has one scheduled must be a no-op, not a second
  scheduled notification — relevant specifically after a device restart (see
  below), where re-registering scheduled notifications must check
  what's already been generated rather than blindly rescheduling everything
  from scratch.

## Device restart

- **Threat/risk**: OS-scheduled local notifications can be cleared by a
  device restart depending on platform/OS version and how they were
  scheduled (e.g. some scheduling APIs persist across restarts, others
  don't, and battery-optimization features can interfere).
- **Architectural mitigation**: because the `Reminder` record (not the
  OS-level scheduled notification) is the actual source of truth, the app
  can and should **re-derive and re-schedule any outstanding local
  notifications on app startup** by comparing existing `Reminder` records
  against what the OS currently has scheduled — self-healing rather than
  purely relying on the OS to have preserved every scheduled notification
  across a restart. This also naturally handles the case where the app was
  killed/restarted without a full device reboot.

## Timezone/date handling

- **[BUSINESS RULE, newly surfaced by this analysis]** Expiration dates and
  reminder offsets must be computed in a way that is stable regardless of
  device timezone changes (e.g. an agent traveling, or a device's clock
  settings changing) — expiration is a *calendar date* concept (Phase 1 §11:
  "expiration date"), not a precise instant, so offset calculations should
  operate on calendar dates, not raw timestamps subject to timezone-shift
  ambiguity at day boundaries. **[OPEN-ARCH]** exact date-library/approach is
  an implementation detail, but "store and compare as calendar dates, not
  timezone-sensitive instants" is the architectural requirement this
  analysis surfaces.

## Restore behavior

- After a backup restore (`/docs/backup/backup-architecture-analysis.md`),
  restored `Reminder` records must be treated as authoritative history — the
  reminder-generation logic must not re-fire reminders that already exist in
  the restored data, and should re-derive any *outstanding* local
  notification scheduling from the restored state, exactly as it does after
  a device restart (same mechanism, different trigger).

## Notification permission denial

- **[CONFIRMED requirement, Phase 1 §13's fallback rule]** If OS-level
  notification permission is denied, local notifications simply cannot be
  delivered — this is a platform-level state the app cannot override.
  Architecturally, the `Reminder` record and its in-app notification-history
  entry are still created regardless of permission state (Phase 1 §13,
  NOTIF-03) — the in-app history is the fallback, decoupled from whether the
  OS-level notification actually reached the user. **[UX-dependent]**
  detecting and prompting about denied permission (e.g. guiding the user to
  Settings) is a UI concern, flagged for the UX-dependencies document, not
  designed here.

## OS restrictions

- Both major mobile platforms impose limits on background execution and
  notification scheduling (e.g. a cap on the number of pending scheduled
  local notifications, battery-optimization throttling of background
  re-evaluation). **[OPEN-ARCH]** Given the default schedule generates up to
  7 reminders per contract, and an agent could plausibly have dozens to
  hundreds of active contracts, the total pending-notification count could
  approach platform-imposed limits at scale — this is a real, currently
  unmeasured risk to validate once realistic data volumes and the target
  platform (ADR-001) are known, not something this document can resolve with
  a number today.

## Risks

- Device-restart/OS-restriction interactions with local notification
  scheduling are the most platform-specific, least architecturally
  controllable part of this entire document — mitigated by the
  re-derive-from-source-of-truth pattern above, but ultimately bounded by
  what the OS allows, which needs empirical validation during
  implementation.
- The "add a new, smaller offset already in the past" edge case (Rescheduling,
  above) needs a product decision, not just an engineering default.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Behavior when a newly configured reminder offset is already in the past
  for existing contracts.
- Exact local-notification scheduling library/approach (pending ADR-001).
- Handling of platform-imposed pending-notification limits at scale.
- UI/UX for notification-permission-denied guidance (UX-dependent).
