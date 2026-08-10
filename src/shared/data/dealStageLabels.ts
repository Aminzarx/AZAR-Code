import type { DealStage } from '@infrastructure/database/repositories/DealRepository'

/**
 * Persian labels for `DealStage` (crm-architecture-audit-v1.md §E.1's
 * 9-stage pipeline) — used by Property/Applicant Detail's Activity
 * section to render a deal's current stage in a recent-activity row.
 * No equivalent map exists for `DealStage` elsewhere in the app yet
 * (only `DEAL_STATUS_LABELS` for the older `DealStatus` field), so this
 * is a new, small, purely-presentational data map, not a duplicate of
 * existing logic.
 */
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'جدید',
  contacted: 'در تماس',
  interested: 'علاقه‌مند',
  visit_scheduled: 'بازدید برنامه‌ریزی‌شده',
  visited: 'بازدیدشده',
  negotiation: 'مذاکره',
  offer: 'پیشنهاد قیمت',
  contract: 'قرارداد',
  won: 'معامله‌شده',
  lost: 'ازدست‌رفته'
}
