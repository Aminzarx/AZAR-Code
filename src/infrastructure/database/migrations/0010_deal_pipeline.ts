import type { Migration } from '../types'

/**
 * Expands `deals` from a flat 6-status enum into a real pipeline
 * (crm-architecture-audit-v1.md §C.7/§E.1): `current_stage` (9-stage
 * state machine), `lost_reason_id` (BR-004 — required once a deal is
 * lost), `expected_value`, `next_action`/`next_action_due_at`, plus a
 * `deal_stage_history` table so every stage transition is recorded, not
 * just the current value.
 *
 * `deals.status` (the old 6-value column) is left in place and NOT
 * backfilled-and-dropped here — existing repository/service code still
 * reads/writes it, and this migration must not break the running app.
 * `current_stage` is backfilled from `status` with the mapping below so
 * a value always exists once the service layer switches over (Phase 2);
 * dropping `status` itself is a later, separate migration once nothing
 * reads it anymore.
 *
 * `lost_reasons` is seeded with the exact list from the architecture
 * brief's §11 (Persian labels are the actual product content here, not
 * a placeholder) — a real table so the UI renders a chip list instead of
 * a free-text reason, per that section's explicit "Lost Reason باید Data
 * باشد، نه فقط متن آزاد."
 */
export const migration0010DealPipeline: Migration = {
  version: 10,
  description: 'Deal pipeline: stages, stage history, lost reasons',
  statements: [
    `CREATE TABLE lost_reasons (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      is_system_default INTEGER NOT NULL DEFAULT 0 CHECK (is_system_default IN (0, 1)),
      created_at TEXT NOT NULL
    )`,
    `INSERT INTO lost_reasons (id, label, is_system_default, created_at) VALUES
      ('lost-reason-price-too-high', 'قیمت بالا', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-property-not-suitable', 'ملک مناسب نبود', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-customer-withdrew', 'مشتری منصرف شد', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-property-sold', 'ملک فروخته شد', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-insufficient-budget', 'بودجه ناکافی', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-other-agent', 'مشتری با مشاور دیگری معامله کرد', 1, '2026-08-10T00:00:00.000Z'),
      ('lost-reason-other', 'سایر', 1, '2026-08-10T00:00:00.000Z')`,

    `ALTER TABLE deals ADD COLUMN current_stage TEXT`,
    `ALTER TABLE deals ADD COLUMN lost_reason_id TEXT REFERENCES lost_reasons(id)`,
    `ALTER TABLE deals ADD COLUMN expected_value REAL`,
    `ALTER TABLE deals ADD COLUMN next_action TEXT`,
    `ALTER TABLE deals ADD COLUMN next_action_due_at TEXT`,

    // Backfill: old 6-status -> new 9-stage mapping (documented, not guessed
    // per-row — see crm-architecture-audit-v1.md §E.1 for the full stage list).
    `UPDATE deals SET current_stage = 'new' WHERE status = 'new'`,
    `UPDATE deals SET current_stage = 'contacted' WHERE status = 'contacted'`,
    `UPDATE deals SET current_stage = 'visited' WHERE status = 'viewing'`,
    `UPDATE deals SET current_stage = 'negotiation' WHERE status = 'negotiating'`,
    `UPDATE deals SET current_stage = 'won' WHERE status = 'completed'`,
    `UPDATE deals SET current_stage = 'lost' WHERE status = 'cancelled'`,

    `CREATE TABLE deal_stage_history (
      id TEXT PRIMARY KEY NOT NULL,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      note TEXT,
      changed_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_deal_stage_history_deal ON deal_stage_history(deal_id)`
  ]
}
