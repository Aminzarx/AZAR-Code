import type { DealStage } from '@infrastructure/database/repositories/DealRepository'
import type { StatusTone } from '@shared/theme/tokens'

/**
 * design-system.md §17.2 — Deal List's status filter/segment, a coarser
 * grouping of the real 9-stage `DealStage` pipeline than
 * `PipelineIndicator`'s 4 visual groups (که تماس/بازدید/مذاکره/قرارداد را
 * یکی می‌کند), matching the brief's example segments exactly: همه | جدید |
 * در جریان | موفق | لغوشده. `currentStage` itself is never altered.
 */
export type DealFilterGroup = 'all' | 'new' | 'inProgress' | 'won' | 'lost'

const IN_PROGRESS_STAGES: readonly DealStage[] = [
  'contacted',
  'interested',
  'visit_scheduled',
  'visited',
  'negotiation',
  'offer',
  'contract'
]

export function dealFilterGroup(stage: DealStage): Exclude<DealFilterGroup, 'all'> {
  if (stage === 'won') {
    return 'won'
  }
  if (stage === 'lost') {
    return 'lost'
  }
  if (IN_PROGRESS_STAGES.includes(stage)) {
    return 'inProgress'
  }
  return 'new'
}

/** design-system.md §17 — won→highlight, lost→neutral, every open stage→inProgress. */
export function dealStageTone(stage: DealStage): StatusTone {
  const group = dealFilterGroup(stage)
  if (group === 'won') {
    return 'highlight'
  }
  if (group === 'lost') {
    return 'neutral'
  }
  return 'inProgress'
}
