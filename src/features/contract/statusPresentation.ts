import type { StatusTone } from '@shared/theme/tokens'
import type { ContractStatus } from './types'

/**
 * design-system.md §17.4 — Contract's real `ContractStatus` values, kept
 * as-is (presentation only, no schema change), mapped to the shared
 * §6.5 Status System tones so a contract's status reads consistently
 * with every other entity's `StatusBadge`. فعال (active, the contract is
 * currently in force) is the healthy default → positive. تکمیل‌شده
 * (completed) is the formal outcome fully delivered — the rare "this is
 * the one" moment, same role a won deal plays → highlight. لغوشده
 * (cancelled) is closed, not an error → neutral, never red.
 */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'فعال',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده'
}

export const CONTRACT_STATUS_TONES: Record<ContractStatus, StatusTone> = {
  active: 'positive',
  completed: 'highlight',
  cancelled: 'neutral'
}
