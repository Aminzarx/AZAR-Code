import RNCalendarEvents from 'react-native-calendar-events'
import {
  clearAllAzarReminders,
  createContractEndReminder,
  deleteContractReminder,
  ensureCalendarPermission,
  subtractMonths
} from '../calendarService'

const mockedEvents = RNCalendarEvents as jest.Mocked<typeof RNCalendarEvents>

describe('subtractMonths', () => {
  it('subtracts whole months from an ISO datetime', () => {
    expect(subtractMonths('2027-09-01T09:00:00', 3)).toBe(
      new Date('2027-06-01T09:00:00').toISOString()
    )
  })

  it('rolls back the year when subtracting past January', () => {
    expect(subtractMonths('2027-01-15T09:00:00', 2)).toBe(
      new Date('2026-11-15T09:00:00').toISOString()
    )
  })
})

describe('ensureCalendarPermission', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns true without requesting when already authorized', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('authorized')
    const requestSpy = jest.spyOn(mockedEvents, 'requestPermissions')

    expect(await ensureCalendarPermission()).toBe(true)
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('requests permission and returns the result when not yet authorized', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('undetermined')
    jest.spyOn(mockedEvents, 'requestPermissions').mockResolvedValue('authorized')

    expect(await ensureCalendarPermission()).toBe(true)
  })

  it('returns false when permission is denied', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('undetermined')
    jest.spyOn(mockedEvents, 'requestPermissions').mockResolvedValue('denied')

    expect(await ensureCalendarPermission()).toBe(false)
  })
})

describe('createContractEndReminder', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns null without saving an event when permission is denied', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('undetermined')
    jest.spyOn(mockedEvents, 'requestPermissions').mockResolvedValue('denied')
    const saveEventSpy = jest.spyOn(mockedEvents, 'saveEvent')

    const eventId = await createContractEndReminder({
      contractId: 'contract-1',
      endDateIso: '2027-09-01',
      offsetMonths: 3,
      title: 'پایان قرارداد'
    })

    expect(eventId).toBeNull()
    expect(saveEventSpy).not.toHaveBeenCalled()
  })

  it('creates the dedicated calendar on first use and saves the event on it', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('authorized')
    jest.spyOn(mockedEvents, 'findCalendars').mockResolvedValue([])
    jest.spyOn(mockedEvents, 'saveCalendar').mockResolvedValue('azar-calendar-id')
    jest.spyOn(mockedEvents, 'saveEvent').mockResolvedValue('event-1')

    const eventId = await createContractEndReminder({
      contractId: 'contract-1',
      endDateIso: '2027-09-01',
      offsetMonths: 3,
      title: 'پایان قرارداد'
    })

    expect(eventId).toBe('event-1')
    expect(mockedEvents.saveEvent).toHaveBeenCalledWith(
      'پایان قرارداد',
      expect.objectContaining({
        calendarId: 'azar-calendar-id',
        startDate: subtractMonths('2027-09-01T09:00:00', 3),
        notes: 'AZAR_CONTRACT_REMINDER:contract-1'
      })
    )
  })

  it('reuses the existing dedicated calendar instead of creating another one', async () => {
    jest.spyOn(mockedEvents, 'checkPermissions').mockResolvedValue('authorized')
    jest
      .spyOn(mockedEvents, 'findCalendars')
      .mockResolvedValue([{ id: 'existing-id', title: 'یادآورهای آذر CRM' } as never])
    const saveCalendarSpy = jest.spyOn(mockedEvents, 'saveCalendar')
    jest.spyOn(mockedEvents, 'saveEvent').mockResolvedValue('event-2')

    await createContractEndReminder({
      contractId: 'contract-1',
      endDateIso: '2027-09-01',
      offsetMonths: 1,
      title: 'پایان قرارداد'
    })

    expect(saveCalendarSpy).not.toHaveBeenCalled()
    expect(mockedEvents.saveEvent).toHaveBeenCalledWith(
      'پایان قرارداد',
      expect.objectContaining({ calendarId: 'existing-id' })
    )
  })
})

describe('deleteContractReminder', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('removes the event', async () => {
    jest.spyOn(mockedEvents, 'removeEvent').mockResolvedValue(true)
    await deleteContractReminder('event-1')
    expect(mockedEvents.removeEvent).toHaveBeenCalledWith('event-1')
  })

  it('does not throw if the event is already gone', async () => {
    jest.spyOn(mockedEvents, 'removeEvent').mockRejectedValue(new Error('not found'))
    await expect(deleteContractReminder('missing')).resolves.toBeUndefined()
  })
})

describe('clearAllAzarReminders', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does nothing when the dedicated calendar was never created', async () => {
    jest.spyOn(mockedEvents, 'findCalendars').mockResolvedValue([])
    const removeCalendarSpy = jest.spyOn(mockedEvents, 'removeCalendar')

    await clearAllAzarReminders()

    expect(removeCalendarSpy).not.toHaveBeenCalled()
  })

  it('removes the dedicated calendar when it exists', async () => {
    jest
      .spyOn(mockedEvents, 'findCalendars')
      .mockResolvedValue([{ id: 'azar-id', title: 'یادآورهای آذر CRM' } as never])
    jest.spyOn(mockedEvents, 'removeCalendar').mockResolvedValue(true)

    await clearAllAzarReminders()

    expect(mockedEvents.removeCalendar).toHaveBeenCalledWith('azar-id')
  })

  it('does not throw if removing the calendar fails', async () => {
    jest
      .spyOn(mockedEvents, 'findCalendars')
      .mockResolvedValue([{ id: 'azar-id', title: 'یادآورهای آذر CRM' } as never])
    jest.spyOn(mockedEvents, 'removeCalendar').mockRejectedValue(new Error('boom'))

    await expect(clearAllAzarReminders()).resolves.toBeUndefined()
  })
})
