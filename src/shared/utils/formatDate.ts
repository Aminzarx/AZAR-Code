/** `fa-IR` date-only formatting, shared by every screen that renders a timestamp (activity rows, reminders). */
export function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('fa-IR')
}

/** `fa-IR` date + time formatting, for timestamps precise enough to matter (reminders, follow-ups). */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return `${date.toLocaleDateString('fa-IR')} • ${date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
}

/** Plain calendar-day comparison (year/month/day only, ignores time-of-day) — reminder time-grouping (§17.3) needs this, not a new scheduling concept. */
export function isSameCalendarDay(isoTimestamp: string, reference: Date): boolean {
  const date = new Date(isoTimestamp)
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}
