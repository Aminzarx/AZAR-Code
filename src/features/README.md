# features/

One directory per product feature (auth, files, matching, contracts,
settings, restore, ...), each holding that feature's screens and
feature-local UI state only. A feature reads/writes business data through
`core/` and `infrastructure/` — it never talks to SQLite, crypto, or the
matching engine directly.

`placeholder/` (Phase 5's build-proof screen) was removed once `dashboard/`
became the app's first real feature screen.
