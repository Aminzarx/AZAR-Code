import { Platform } from 'react-native'
import RNCalendarEvents from 'react-native-calendar-events'

/**
 * Every reminder this app writes lives in its own dedicated device
 * calendar, found/created by this exact title — never mixed into the
 * user's personal calendar. This is what makes `clearAllAzarReminders`
 * (a fresh-install cleanup) safe: deleting this one calendar can never
 * touch an event the user created themselves.
 */
const CALENDAR_TITLE = 'یادآورهای آذر CRM'

/** Requests calendar write access if not already granted; returns whether it's usable. */
export async function ensureCalendarPermission(): Promise<boolean> {
  const status = await RNCalendarEvents.checkPermissions()
  if (status === 'authorized') {
    return true
  }
  const requested = await RNCalendarEvents.requestPermissions()
  return requested === 'authorized'
}

async function findAzarCalendarId(): Promise<string | null> {
  const calendars = await RNCalendarEvents.findCalendars()
  return calendars.find((calendar) => calendar.title === CALENDAR_TITLE)?.id ?? null
}

async function getOrCreateAzarCalendarId(): Promise<string> {
  const existing = await findAzarCalendarId()
  if (existing) {
    return existing
  }
  return RNCalendarEvents.saveCalendar({
    title: CALENDAR_TITLE,
    color: '#2E7D32',
    entityType: 'event',
    name: CALENDAR_TITLE,
    accessLevel: 'owner',
    ownerAccount: CALENDAR_TITLE,
    source:
      Platform.OS === 'ios'
        ? { name: CALENDAR_TITLE, isLocalAccount: true }
        : { name: CALENDAR_TITLE, type: 'LOCAL' }
  })
}

/** Subtracts whole calendar months from an ISO date/datetime string. */
export function subtractMonths(isoDateTime: string, months: number): string {
  const date = new Date(isoDateTime)
  date.setMonth(date.getMonth() - months)
  return date.toISOString()
}

export type ContractEndReminderParams = {
  contractId: string
  /** Gregorian ISO date (`YYYY-MM-DD`), as stored on the contract. */
  endDateIso: string
  /** How many whole months before `endDateIso` the reminder should fire. */
  offsetMonths: number
  title: string
}

/**
 * Creates the contract-end reminder in the phone's calendar and returns
 * the native event id to store on the contract row (so it can be found
 * and removed later). Returns `null` without throwing if calendar
 * permission is denied — a missing reminder is a degraded experience,
 * not a reason to fail saving the contract itself.
 */
export async function createContractEndReminder(
  params: ContractEndReminderParams
): Promise<string | null> {
  const granted = await ensureCalendarPermission()
  if (!granted) {
    return null
  }

  const calendarId = await getOrCreateAzarCalendarId()
  const reminderAt = subtractMonths(`${params.endDateIso}T09:00:00`, params.offsetMonths)

  return RNCalendarEvents.saveEvent(params.title, {
    calendarId,
    startDate: reminderAt,
    endDate: reminderAt,
    allDay: false,
    notes: `AZAR_CONTRACT_REMINDER:${params.contractId}`,
    alarms: [{ date: 0 }]
  })
}

/** Best-effort delete — a reminder the user already removed manually from their calendar app is not an error here. */
export async function deleteContractReminder(eventId: string): Promise<void> {
  try {
    await RNCalendarEvents.removeEvent(eventId)
  } catch {
    // Already gone — nothing to clean up.
  }
}

/**
 * Deletes the app's entire dedicated calendar (and every reminder in
 * it) in one call — the fresh-install cleanup: this app's own SQLite
 * database is wiped on reinstall, so every `calendar_event_id` it used
 * to track is gone too, but the OS calendar itself survives a
 * reinstall. Without this, reminders from a previous install would
 * linger forever with no way to find them again. No-op (not an error)
 * if the calendar was never created.
 */
export async function clearAllAzarReminders(): Promise<void> {
  const calendarId = await findAzarCalendarId()
  if (!calendarId) {
    return
  }
  try {
    await RNCalendarEvents.removeCalendar(calendarId)
  } catch {
    // Best-effort — nothing else to do if this fails.
  }
}
