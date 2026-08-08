# AZAR CRM

Offline-first, local-first mobile CRM for a single-agent real-estate user
(owner/applicant file management, deterministic matching, contract and
reminder tracking), built with React Native.

Documentation is authoritative and lives in `/docs`; UI/UX source is
`/design/stitch/stitch_elite_real_estate_crm/`. Start with
`docs/implementation/00-session-handoff.md` before making architecture or
UI decisions.

## Status

Phase 5 — Project Foundation. No product features are implemented yet;
this is the React Native project shell (navigation, TypeScript, lint,
test harness) the rest of the roadmap builds on
(`docs/implementation/implementation-roadmap.md`).

## Requirements

- Node.js >= 22.11
- Android: Android Studio / SDK (API 26 minimum, latest stable as
  target/compile SDK) for `npm run android`
- iOS: Xcode + CocoaPods (macOS only) for `npm run ios`

## Project setup

```bash
npm install
```

## Development

```bash
npm start        # Metro bundler
npm run android  # run on Android emulator/device
npm run ios      # run on iOS simulator/device (macOS only)
```

## Quality checks

```bash
npm run typecheck  # TypeScript, strict mode
npm run lint        # ESLint
npm run format       # Prettier (write)
npm test              # Jest
```

## Source layout

```
src/
├── app/            # App root component, providers
├── navigation/      # Navigation container and route trees
├── core/             # Local Application Core: matching engine, contract/
│                      # reminder logic, backup orchestration (Phase 6+,
│                      # platform-agnostic, no React import)
├── features/          # One directory per product feature (screens only)
├── shared/              # Reusable design-system components and utilities
└── infrastructure/       # Platform adapters: SQLite, secure storage,
                            # crypto, notifications (Phase 6+)
```
