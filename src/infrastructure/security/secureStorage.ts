/**
 * Minimal seam over platform secure storage (Keychain/Keystore) — exists
 * so the "generate a key if absent, otherwise reuse it" logic in
 * databaseKey.ts is testable without a real device (react-native-keychain
 * has no Node binding, unlike op-sqlite). This is the same "thin
 * platform-adapter layer" pattern ADR-001 already establishes for the
 * Local Application Core, applied to the one piece of Phase 7 that
 * genuinely needs it — not a new abstraction invented for its own sake.
 */
export type SecureStorage = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}
