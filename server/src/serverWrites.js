// Amin #6330: the app and the office dashboard work on the same files. When the server itself writes into an
// account's copy (the dashboard made or changed a file, an office's files came home), it notes the time here; the app
// reads it from POST /presence (every 2 minutes on screen, and on coming back to the front) and reloads its files
// when it is newer than its last load. One row per account; nothing else is kept.
const db = require('./db')

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_server_writes (
    account_id TEXT PRIMARY KEY,
    at TEXT NOT NULL
  );
`)

const put = db.prepare(`INSERT INTO sync_server_writes (account_id, at) VALUES (?, ?)
  ON CONFLICT(account_id) DO UPDATE SET at = excluded.at WHERE excluded.at > sync_server_writes.at`)
const get = db.prepare('SELECT at FROM sync_server_writes WHERE account_id = ?')

/** the server wrote into this account's copy now (or at `at`) */
function mark(accountId, at = new Date().toISOString()) {
  if (accountId) put.run(accountId, at)
}
/** the last time the server wrote into this account's copy, or null */
function lastOf(accountId) {
  return get.get(accountId)?.at ?? null
}

module.exports = { mark, lastOf }
