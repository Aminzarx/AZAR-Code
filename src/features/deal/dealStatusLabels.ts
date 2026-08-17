import type { DealStatus } from './types'

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  new: 'جدید',
  contacted: 'در تماس',
  viewing: 'بازدید',
  negotiating: 'مذاکره',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده'
}
