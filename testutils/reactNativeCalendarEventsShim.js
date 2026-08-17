/**
 * Jest-only stand-in for react-native-calendar-events (mapped in
 * jest.config.js). Its real module reads `NativeModules.RNCalendarEvents`,
 * which is undefined under Jest (no native module registered) — every
 * method would throw immediately. Tests that need specific behavior mock
 * this module themselves per-test; this is just a safe default so
 * anything that merely imports CalendarService doesn't crash.
 */
module.exports = {
  __esModule: true,
  default: {
    checkPermissions: () => Promise.resolve('undetermined'),
    requestPermissions: () => Promise.resolve('denied'),
    findCalendars: () => Promise.resolve([]),
    saveCalendar: () => Promise.resolve('mock-calendar-id'),
    removeCalendar: () => Promise.resolve(true),
    findEventById: () => Promise.resolve(null),
    fetchAllEvents: () => Promise.resolve([]),
    saveEvent: () => Promise.resolve('mock-event-id'),
    removeEvent: () => Promise.resolve(true)
  }
}
