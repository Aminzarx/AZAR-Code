// EYVAN web: the browser has no phone calendar. «denied» makes the app keep reminders in-app; the reminder screens
// offer a .ics file instead (#5183 plan).
const denied = async () => 'denied' as const
const unavailable = async (): Promise<never> => {
  throw new Error('no calendar on the web')
}
export default {
  checkPermissions: denied,
  requestPermissions: denied,
  findCalendars: async () => [] as Array<{ id: string; title: string; source?: string; allowsModifications?: boolean }>,
  saveCalendar: unavailable,
  saveEvent: unavailable,
  removeEvent: async () => false,
  removeCalendar: async () => false
}
