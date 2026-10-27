/**
 * Home's top line (Amin #5749): «سلام» by day, «شب بخیر» from 18:00 to 05:00. Simple local-hour bands, not
 * sunrise/sunset — a CRM greeting only needs to feel right for the hour.
 */
export function getTimeBasedGreeting(now: Date = new Date()): string {
  const hour = now.getHours()
  return hour >= 5 && hour < 18 ? 'سلام' : 'شب بخیر'
}

/** Amin #5749: between 01:00 and 04:00, once a day, one of these stands in for the greeting. */
export const NIGHT_LINES = [
  'گرگ‌ها در شب شکار می‌کنند!',
  'هنوز توی میدونی؟',
  'شب بخیر؟ هنوز زوده!',
  'بیداری؟ ایوانم بیداره!'
] as const

export function isNightOwlHour(now: Date = new Date()): boolean {
  const hour = now.getHours()
  return hour >= 1 && hour < 4
}

/** The local calendar day, the key that keeps the night line to once a day. */
export function localDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

export function pickNightLine(random: () => number = Math.random): string {
  return NIGHT_LINES[Math.min(NIGHT_LINES.length - 1, Math.floor(random() * NIGHT_LINES.length))]
}
