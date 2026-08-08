# features/

One directory per product feature (auth, files, matching, contracts,
settings, restore, ...), each holding that feature's screens and
feature-local UI state only. A feature reads/writes business data through
`core/` and `infrastructure/` — it never talks to SQLite, crypto, or the
matching engine directly.

`placeholder/` is Phase 5's only entry: a non-product screen that exists
solely to prove the app builds, navigates, and renders on both platforms.
It is removed once Phase 12 adds real feature screens.
