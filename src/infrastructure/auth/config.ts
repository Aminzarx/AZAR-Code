// Hardcoded per explicit product decision — the app talks to exactly one
// backend (server/, deployed to the VPS sandbox described in
// server/README.md). See ADR-009 for why this is the app's *entire*
// online surface (auth + referral only, no business data).
// TEASER CAPTURE ONLY: the local stack through adb reverse tcp:8799
export const AUTH_API_BASE_URL = 'http://localhost:8799'
