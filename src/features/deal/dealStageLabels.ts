import { DEAL_STAGES, type DealStage } from '@infrastructure/database/repositories/DealRepository'

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'جدید',
  contacted: 'در تماس',
  interested: 'علاقه‌مند',
  visit_scheduled: 'بازدید برنامه‌ریزی‌شده',
  visited: 'بازدید شد',
  negotiation: 'مذاکره',
  offer: 'پیشنهاد قیمت',
  contract: 'قرارداد',
  won: 'موفق',
  lost: 'لغوشده'
}

const FORWARD_STAGES: readonly DealStage[] = DEAL_STAGES.filter(
  (stage) => stage !== 'won' && stage !== 'lost'
)

/**
 * Next stage in the forward pipeline order (design-system.md §17's
 * `new → ... → contract` sequence), or `null` once at the last
 * pre-terminal stage (`contract`) or already at a terminal one
 * (`won`/`lost` never advance further this way — see the dedicated
 * "mark won"/"mark lost" actions instead).
 */
export function getNextStage(stage: DealStage): DealStage | null {
  const index = FORWARD_STAGES.indexOf(stage)
  if (index === -1 || index === FORWARD_STAGES.length - 1) {
    return null
  }
  return FORWARD_STAGES[index + 1]
}
