// Hardcoded per explicit product decision — the app talks to exactly one
// backend (server/, deployed to the VPS sandbox described in
// server/README.md). See ADR-009 for why this is the app's *entire*
// online surface (auth + referral only, no business data).
export const AUTH_API_BASE_URL = 'https://api.zarandix.ir'
