/**
 * Time-of-day greeting for the Dashboard header, replacing the always-the-
 * -same "خوش آمدید". Boundaries are simple local-hour bands, not
 * astronomical sunrise/sunset — a CRM greeting doesn't need that
 * precision, just to feel like it's actually morning/afternoon/night.
 */
export function getTimeBasedGreeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour >= 5 && hour < 12) {
    return 'صبح بخیر'
  }
  if (hour >= 12 && hour < 18) {
    return 'عصر بخیر'
  }
  return 'شب بخیر'
}
