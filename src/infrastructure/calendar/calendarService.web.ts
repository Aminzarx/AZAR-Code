/**
 * EYVAN web (#5183): a browser cannot write to the phone's calendar. When the user sets a contract-end reminder, the
 * app hands the phone a calendar file (.ics) instead; iPhone opens it with «Add to Calendar», with an alert on the
 * day. The app's own follow-up list (Home) keeps working as on Android. Nothing can be removed from the phone's
 * calendar later, so delete and clear-all do nothing here.
 */
const CALENDAR_NAME = 'یادآورهای ایوان'

export async function ensureCalendarPermission(): Promise<boolean> {
  return false
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

const icsTime = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export function contractReminderIcs(params: ContractEndReminderParams, now = new Date()): string {
  const at = icsTime(subtractMonths(`${params.endDateIso}T09:00:00`, params.offsetMonths))
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KSS//EYVAN//FA',
    `X-WR-CALNAME:${icsText(CALENDAR_NAME)}`,
    'BEGIN:VEVENT',
    `UID:eyvan-contract-${params.contractId}@kssx.ir`,
    `DTSTAMP:${icsTime(now.toISOString())}`,
    `DTSTART:${at}`,
    `DTEND:${at}`,
    `SUMMARY:${icsText(params.title)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(params.title)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n')
}

/** Offers the reminder as a calendar file; the id marks the contract as «reminder given» (it cannot be removed). */
export async function createContractEndReminder(params: ContractEndReminderParams): Promise<string | null> {
  try {
    const url = URL.createObjectURL(new Blob([contractReminderIcs(params)], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'eyvan-reminder.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return `ics:${params.contractId}`
  } catch {
    return null
  }
}

export async function deleteContractReminder(_eventId: string): Promise<void> {}

export async function clearAllAzarReminders(): Promise<void> {}
