import { getDatabase, wasDatabaseFreshlyCreated } from '@infrastructure/database/connection'
import { clearAllAzarReminders } from '@infrastructure/calendar/calendarService'

/**
 * Runs once per app launch, before anything else needs the database.
 * Currently just the fresh-install calendar cleanup: this app's own
 * SQLite database is wiped on reinstall, but the OS calendar (where
 * contract-end reminders live) survives it — without this, reminders
 * from a previous install would linger with nothing left that knows
 * about them. Best-effort: a failure here should never block the app
 * from starting.
 */
export async function runStartupTasks(): Promise<void> {
  try {
    await getDatabase()
    if (wasDatabaseFreshlyCreated()) {
      await clearAllAzarReminders()
    }
  } catch {
    // Best-effort startup housekeeping — never block the app on this.
  }
}
