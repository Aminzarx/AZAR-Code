import { argon2 } from 'react-native-quick-crypto'

/**
 * Argon2id parameters. Starting values only — per ADR-012 (which keeps
 * Argon2id itself, just drops the enterprise-tier hardening around it),
 * these still need empirical validation against a real low/mid-range
 * device before being treated as final; see the original rationale in
 * docs/architecture/backup-encryption-design.md §3.1. Not benchmarked in
 * this pass (no device available in this environment — same limitation
 * recorded for every native-build-dependent item since Phase 5).
 */
export const DEFAULT_KDF_PARAMS = {
  memoryKiB: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
  hashLengthBytes: 32
} as const

const ARGON2_VERSION = 0x13 // RFC 9106 version 19, the current standard

export type KdfParams = {
  memoryKiB: number
  iterations: number
  parallelism: number
  hashLengthBytes: number
}

/**
 * Derives a key from a password and salt using Argon2id — the single KDF
 * this project uses (ADR-012), no separate DEK/KEK split. Uses the
 * callback (off-JS-thread) variant rather than argon2Sync so an
 * intentionally expensive KDF call doesn't block the UI thread — a
 * basic UX property, not the enterprise-tier hardening ADR-012 dropped.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: params.parallelism,
        tagLength: params.hashLengthBytes,
        memory: params.memoryKiB,
        passes: params.iterations,
        version: ARGON2_VERSION
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(new Uint8Array(result))
      }
    )
  })
}
