import { Platform } from 'react-native'
import RNCalendarEvents from 'react-native-calendar-events'

/**
 * Every reminder this app writes lives in its own dedicated device
 * calendar, found/created by this exact title — never mixed into the
 * user's personal calendar. This is what makes `clearAllAzarReminders`
 * (a fresh-install cleanup, and since Amin #5112 also on sign-out and account deletion) safe: deleting this one
 * calendar can never touch an event the user created themselves.
 */
const CALENDAR_TITLE = 'یادآورهای ایوان'
/** the calendar's name before the app was EYVAN — still found, so older reminders are cleaned up too */
const LEGACY_CALENDAR_TITLES = ['یادآورهای آذر CRM']

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

/** this app's calendars, the current one and any left from the older name */
async function findAllAzarCalendarIds(): Promise<string[]> {
  const titles = [CALENDAR_TITLE, ...LEGACY_CALENDAR_TITLES]
  const calendars = await RNCalendarEvents.findCalendars()
  return calendars.filter((calendar) => titles.includes(calendar.title)).map((calendar) => calendar.id)
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
 * it) in one call. Runs:
 * - on a fresh install: this app's own SQLite database is wiped on reinstall, so every `calendar_event_id` it
 *   used to track is gone too, but the OS calendar itself survives a reinstall;
 * - Amin #5112: on sign-out and on account deletion, so no reminder of the account stays on the phone.
 * An uninstall itself cannot be caught by the app: its reminders go at the next install's first start, or with
 * this one calendar in the phone's calendar app. Never asks for calendar permission (without it the app never
 * wrote any), and never throws.
 */
export async function clearAllAzarReminders(): Promise<void> {
  try {
    if ((await RNCalendarEvents.checkPermissions()) !== 'authorized') {
      return
    }
    for (const calendarId of await findAllAzarCalendarIds()) {
      await RNCalendarEvents.removeCalendar(calendarId)
    }
  } catch {
    // Best-effort — nothing else to do if this fails.
  }
}
