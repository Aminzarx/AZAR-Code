# infrastructure/

Platform adapters that `core/` depends on through an interface, never the
other way around.

- `database/` (Phase 6) — SQLite connection, migration runner, schema, and
  the repository layer. The _only_ place in the codebase allowed to run
  SQL; still unencrypted (SQLCipher wrapping is Phase 7).
- SQLCipher/secure-storage/crypto bindings (Phase 7), local-notification
  scheduling (Phase 10) land here once their phase starts.
