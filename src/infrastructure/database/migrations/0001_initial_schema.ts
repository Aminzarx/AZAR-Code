import type { Migration } from '../types'

/**
 * Schema version 1 — the entities from docs/database/conceptual-data-model.md
 * whose shape has no OPEN-ARCH question attached. Field lists follow only
 * what that document (and 04-final-architecture.md §9's indexing summary)
 * actually names; no undocumented business field or enum value is invented
 * here (e.g. `transaction_type`/`property_type`/`listing_status` stay as
 * unconstrained TEXT because their exact allowed values are not specified
 * anywhere yet — constraining them would be guessing a product decision).
 *
 * Deliberately EXCLUDED from this version, and why (not an oversight):
 * - Contract / ContractEvent / Reminder — `Contract.tenant`'s relationship
 *   shape (ApplicantFile-backed vs. minimal record) is explicitly
 *   OPEN-ARCH (conceptual-data-model.md §"Important constraints"). Reminder
 *   has a required FK to Contract, so it is blocked transitively.
 * - AuditLogEntry, Notification — both explicitly flagged OPEN-ARCH for
 *   their typed-reference mechanism (same document, same section).
 * - BackupMetadata — explicitly named "provisional" pending the backup
 *   format decisions in docs/backup/backup-architecture-analysis.md.
 * These are added in a later migration once their documented shape
 * question is resolved, per this project's "never guess an unresolved
 * decision" rule — not silently designed here.
 */
export const migration0001InitialSchema: Migration = {
  version: 1,
  description: 'Initial schema foundation (Phase 6)',
  statements: [
    // ── User / referral / session ────────────────────────────────────────
    `CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      referral_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // Immutable-after-registration (ADR-009) is an application-layer rule —
    // this table's UNIQUE constraint on referred_user_id is what makes "at
    // most one relationship as referred" a structural guarantee; the "never
    // updated after creation" half of the rule has no SQL-level enforcement
    // (there is no portable, non-over-engineered way to forbid UPDATE on a
    // single column without triggers this phase doesn't need yet) and must
    // stay enforced by the repository layer that owns writes to this table.
    `CREATE TABLE referral_relationships (
      id TEXT PRIMARY KEY NOT NULL,
      referrer_user_id TEXT NOT NULL REFERENCES users(id),
      referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_referral_relationships_referrer
      ON referral_relationships(referrer_user_id)`,

    `CREATE TABLE sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT,
      revoked_at TEXT
    )`,
    `CREATE INDEX idx_sessions_user ON sessions(user_id)`,

    // ── Shared structured reference data ────────────────────────────────
    `CREATE TABLE locations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE amenities (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    )`,

    // ── OwnerFile (carries PropertyAttributes per the conceptual model's
    //    note that it is not a separate table) ──────────────────────────
    `CREATE TABLE owner_files (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      preferred_contact_method TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      property_type TEXT,
      transaction_type TEXT,
      price REAL,
      area REAL,
      bedrooms INTEGER,
      bathrooms INTEGER,
      location_id TEXT REFERENCES locations(id),
      condition_age TEXT,
      listing_status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_owner_files_status ON owner_files(status)`,
    `CREATE INDEX idx_owner_files_property_type ON owner_files(property_type)`,
    `CREATE INDEX idx_owner_files_transaction_type ON owner_files(transaction_type)`,
    `CREATE INDEX idx_owner_files_location ON owner_files(location_id)`,
    `CREATE INDEX idx_owner_files_price ON owner_files(price)`,
    `CREATE INDEX idx_owner_files_bedrooms ON owner_files(bedrooms)`,

    `CREATE TABLE owner_file_amenities (
      owner_file_id TEXT NOT NULL REFERENCES owner_files(id) ON DELETE CASCADE,
      amenity_id TEXT NOT NULL REFERENCES amenities(id),
      PRIMARY KEY (owner_file_id, amenity_id)
    )`,

    // ── ApplicantFile + RequirementCriterion (= the applicant's
    //    preference set — conceptual model's explicit note that this is
    //    not a separate "ApplicantPreferences" entity) ──────────────────
    `CREATE TABLE applicant_files (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      preferred_contact_method TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_applicant_files_status ON applicant_files(status)`,

    // priority CHECK values are the documented MUST_HAVE/IMPORTANT/
    // PREFERRED/IGNORE model (ADR-006) — not invented here.
    `CREATE TABLE requirement_criteria (
      id TEXT PRIMARY KEY NOT NULL,
      applicant_file_id TEXT NOT NULL REFERENCES applicant_files(id) ON DELETE CASCADE,
      target_field TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('MUST_HAVE', 'IMPORTANT', 'PREFERRED', 'IGNORE')),
      value_text TEXT,
      value_min REAL,
      value_max REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_requirement_criteria_applicant
      ON requirement_criteria(applicant_file_id)`,
    `CREATE INDEX idx_requirement_criteria_target_field
      ON requirement_criteria(target_field)`,

    // Conditional-suppression relationship (conceptual-data-model.md
    // §"Conditional criteria") — a criterion names the criteria it
    // suppresses when satisfied.
    `CREATE TABLE requirement_criterion_suppressions (
      criterion_id TEXT NOT NULL REFERENCES requirement_criteria(id) ON DELETE CASCADE,
      suppressed_criterion_id TEXT NOT NULL REFERENCES requirement_criteria(id) ON DELETE CASCADE,
      PRIMARY KEY (criterion_id, suppressed_criterion_id)
    )`,

    `CREATE TABLE restrictions (
      id TEXT PRIMARY KEY NOT NULL,
      applicant_file_id TEXT NOT NULL REFERENCES applicant_files(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_restrictions_applicant ON restrictions(applicant_file_id)`,

    // ── Match / MatchExplanation (structurally 1:1 — enforced by the
    //    UNIQUE constraint on match_id, per the conceptual model's
    //    explicit "should not exist without its explanation" rule) ──────
    `CREATE TABLE matches (
      id TEXT PRIMARY KEY NOT NULL,
      owner_file_id TEXT NOT NULL REFERENCES owner_files(id) ON DELETE CASCADE,
      applicant_file_id TEXT NOT NULL REFERENCES applicant_files(id) ON DELETE CASCADE,
      score REAL NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_matches_owner_file ON matches(owner_file_id)`,
    `CREATE INDEX idx_matches_applicant_file ON matches(applicant_file_id)`,

    `CREATE TABLE match_explanations (
      id TEXT PRIMARY KEY NOT NULL,
      match_id TEXT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // ── ReminderSchedule (configuration only — Reminder instances are
    //    deferred with Contract, see module header) ─────────────────────
    `CREATE TABLE reminder_schedules (
      id TEXT PRIMARY KEY NOT NULL,
      offsets_json TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1 CHECK (is_default IN (0, 1)),
      created_at TEXT NOT NULL
    )`,

    // ── Notes (never a matching input — never indexed for matching,
    //    only for chronological display, per the conceptual model) ──────
    `CREATE TABLE notes (
      id TEXT PRIMARY KEY NOT NULL,
      owner_file_id TEXT REFERENCES owner_files(id) ON DELETE CASCADE,
      applicant_file_id TEXT REFERENCES applicant_files(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK ((owner_file_id IS NOT NULL) <> (applicant_file_id IS NOT NULL))
    )`,
    `CREATE INDEX idx_notes_owner_file ON notes(owner_file_id, created_at)`,
    `CREATE INDEX idx_notes_applicant_file ON notes(applicant_file_id, created_at)`,

    // ── ApplicationSettings — device-local, non-business-data preferences.
    //    Lives in the same physical database as everything else in Phase 6
    //    (no encryption exists yet at all), but is kept as its own table
    //    now so Phase 7 can exclude it from the encrypted-database boundary
    //    per ADR-005's "what is not encrypted" note without a schema
    //    change later. ──────────────────────────────────────────────────
    `CREATE TABLE application_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL
    )`
  ]
}
