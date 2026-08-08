# infrastructure/

Platform adapters that `core/` depends on through an interface, never the
other way around: SQLite access (Phase 6), SQLCipher/secure-storage/crypto
bindings (Phase 7), local-notification scheduling (Phase 10).

Intentionally empty in Phase 5 — no platform integration exists yet.
