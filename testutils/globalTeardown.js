/**
 * Safety net for the per-worker SQLite files created by connection.test.ts,
 * dashboardDataService.test.ts, and App.test.tsx (the only suites that
 * exercise the real getDatabase() singleton instead of an in-memory DB —
 * see src/infrastructure/database/connection.ts for why the filename is
 * suffixed with JEST_WORKER_ID). Each of those suites deletes its own file
 * in afterEach, but a worker that gets killed between its last test and
 * that cleanup (e.g. hitting --workerIdleMemoryLimit) can leave one behind.
 * Sweeping here keeps the repo root clean regardless of worker lifecycle.
 */
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function globalTeardown() {
  const files = fs.readdirSync(process.cwd())
  for (const file of files) {
    if (/^azar\.test-.*\.db(-wal|-shm)?$/.test(file)) {
      fs.unlinkSync(path.join(process.cwd(), file))
    }
  }
}
