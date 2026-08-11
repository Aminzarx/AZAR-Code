const Database = require('better-sqlite3')
const path = require('node:path')
const fs = require('node:fs')

const DB_PATH = process.env.AZAR_DB_PATH || path.join(__dirname, '..', 'data', 'azar-auth.db')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Deliberately narrow schema — only the ADR-009 online surface (phone
// numbers, OTP-request state, referral relationships, sessions). No
// business data (properties/applicants/deals/...) lives here; that stays
// on-device per ADR-002.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    referral_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referral_relationships (
    id TEXT PRIMARY KEY,
    referrer_user_id TEXT NOT NULL REFERENCES users(id),
    referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_requests (
    phone_number TEXT PRIMARY KEY,
    verified INTEGER NOT NULL DEFAULT 0,
    requested_at TEXT NOT NULL,
    verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );
`)

// Registration requires a valid referral code with no bypass (ADR-009), so a
// brand-new server has no user to be a referrer for the very first real
// registration. Mirrors the client's own former bootstrap-seed migration
// (0007_seed_bootstrap_referral_user.ts) so "AZARSEED" keeps working as the
// one out-of-band-provisioned starting code.
db.prepare(
  `INSERT OR IGNORE INTO users (id, phone_number, referral_code, created_at)
   VALUES ('bootstrap-seed-user', '09100000000', 'AZARSEED', '2026-01-01T00:00:00.000Z')`
).run()

module.exports = db
