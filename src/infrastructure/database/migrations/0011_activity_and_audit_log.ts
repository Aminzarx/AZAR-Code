import type { Migration } from '../types'

/**
 * `activities` — a real event log (crm-architecture-audit-v1.md §C.9),
 * replacing the Dashboard's current "Recent Activity" which is
 * synthesized live from raw `created_at` timestamps across three tables
 * (see dashboardDataService.ts). MVP scope is auto-logged system events
 * only (created/updated/status_change) — manual Call/Message logging
 * (§13 of the brief) is explicitly deferred (no real telephony/SMS
 * integration exists, and the brief itself says not to build UI that
 * pretends one does).
 *
 * `audit_log` — scoped narrowly per the architecture doc's MVP decision:
 * only price, status, and assignment changes (not an unbounded generic
 * field-history mechanism), each row a single before/after value pair.
 *
 * Both tables are additive and unused by any existing code path in this
 * migration — wiring them up (auto-logging on write) is Phase 2/3, not
 * this schema step.
 */
export const migration0011ActivityAndAuditLog: Migration = {
  version: 11,
  description: 'Activity log + scoped audit log',
  statements: [
    `CREATE TABLE activities (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id)`,
    `CREATE INDEX idx_activities_user_created ON activities(user_id, created_at)`,

    `CREATE TABLE audit_log (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id)`
  ]
}
