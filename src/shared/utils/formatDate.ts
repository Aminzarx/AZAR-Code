// `fa-IR` alone resolves to the Gregorian calendar on this app's Hermes/
// ICU build (confirmed on-device — dates rendered as e.g. "۲۰۲۶/۸/۱۲",
// Persian digits but the Gregorian year/month/day underneath). The
// `-u-ca-persian` BCP-47 extension explicitly requests the Jalali
// calendar, which is what a Persian-first app actually needs.
const PERSIAN_CALENDAR_LOCALE = 'fa-IR-u-ca-persian'

/** Jalali date-only formatting, shared by every screen that renders a timestamp (activity rows, reminders). */
export function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString(PERSIAN_CALENDAR_LOCALE)
}

/** Jalali date + time formatting, for timestamps precise enough to matter (reminders, follow-ups). */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return `${date.toLocaleDateString(PERSIAN_CALENDAR_LOCALE)} • ${date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
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
