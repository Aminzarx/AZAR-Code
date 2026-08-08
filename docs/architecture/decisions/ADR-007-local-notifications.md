# ADR-007 — Local Notifications for Contract Reminders

Status: **CONFIRMED** (architecture and policy) with **[OPEN-ARCH]**
scheduling-library selection deferred pending ADR-001. See
`/docs/notifications/notification-architecture.md` for the full analysis;
this ADR records the decision in the standard ADR shape.
Date: 2026-08-08

## Context

Phase 0 Decision 4 confirmed contract reminders use local device
notifications, not push — there is no cloud notification service and no
server-side job runner for this product. Reminder generation and delivery
must work entirely offline, must be idempotent, and must survive device
restarts and app kills without duplicating or losing reminders.

## Decision

- **Reminder generation is the durable source of truth; OS-level
  notification scheduling is a re-derivable delivery mechanism.** A
  `Reminder` database record, unique on `(contract_id, offset)`, is
  generated once per contract/offset pair when its target date arrives.
  The OS-level scheduled local notification for that reminder can be
  re-scheduled at any time (app startup, after a device restart) by
  comparing existing `Reminder` records against what the OS currently has
  scheduled — self-healing rather than trusting the OS to have preserved
  every scheduled notification indefinitely.
- **Idempotency is enforced at the data layer**, via a unique constraint on
  `(contract_id, offset)` in the `Reminder` table — not as an
  application-level "check then insert," which is vulnerable to a race if
  the evaluation runs twice concurrently (e.g. an app-open trigger
  overlapping a background trigger).
- **Default offsets**: 90, 60, 30, 14, 7, 3 days before expiration, and
  the expiration day itself ("On Expiration") — FINAL, per the
  project-owner decision recorded in `/docs/changelog.md`.
- **Expiration/offset calculation operates on calendar dates**, not
  timezone-sensitive instants, so a device timezone change (e.g. an agent
  traveling) does not shift which day a reminder fires on.
- **In-app notification history is created regardless of OS-level
  permission state.** If notification permission is denied, the
  `Reminder` record and its in-app history entry are still generated —
  the in-app history is the fallback the user can always check, decoupled
  from whether an OS-level notification actually reached them.
- **A schedule-configuration change applies going forward, not
  retroactively** — already-fired reminders are unaffected by a later
  offset-set change (Phase 2 REM-02).

## Alternatives considered

- **A server-scheduled push notification system** — rejected outright:
  contradicts the no-cloud-business-infrastructure constraint and would
  require the app to be online for reminders to fire at all, which this
  product's offline-first model does not allow.
- **Recomputing "is a reminder due" live on every app open with no
  persisted `Reminder` record** — rejected: cannot support idempotent,
  device-restart-surviving notification scheduling, since there would be
  nothing durable to compare "already scheduled" against, and would
  silently miss reminders while the app is closed for the exact days they
  should fire.
- **Treating the OS-scheduled notification itself as the source of
  truth** — rejected: OS-scheduled notifications can be cleared by a
  device restart or battery-optimization behavior depending on platform/
  version; anchoring correctness to something the OS is allowed to discard
  would make the reminder system unreliable by design.

## Consequences

- Reminder generation logic must run inside a transaction alongside any
  related writes (e.g. contract creation triggering initial reminder
  schedule evaluation), per the local-data-architecture transaction
  requirement.
- After a backup restore, restored `Reminder` records are treated as
  authoritative history — the app must not re-fire reminders that already
  exist in the restored data, using the same re-derive-and-reschedule
  mechanism as a device restart.
- Implementation must budget for platform-imposed pending-notification
  limits at scale (an agent with dozens to hundreds of active contracts,
  each generating up to 7 reminders, could approach platform caps) —
  flagged as a real, currently unmeasured risk, not resolved by this ADR.

## Security implications

Minimal — local notifications may display contract/tenant details on the
lock screen depending on OS notification-privacy settings, which overlaps
with the app-switcher/screenshot privacy consideration already flagged in
`/docs/security/threat-model.md` as open and UX-dependent.

## Performance implications

Reminder evaluation is a lightweight per-contract, per-offset check backed
by an indexed `(contract_id, offset)` lookup — not expected to be a
bottleneck even at large contract counts; the real constraint is the
platform's own notification-scheduling limits, not this app's computation.

## Status

**CONFIRMED** for the architecture (durable-record-plus-re-derivable-
delivery pattern, idempotency mechanism, calendar-date semantics, default
offsets). **[OPEN-ARCH]**: exact scheduling library/API (depends on
ADR-001), and the still-open product question of whether a newly
configured offset that is already in the past for existing contracts
should fire immediately or only apply going forward — tracked in
`/docs/architecture/unresolved-decisions.md`.
