import { Buffer } from 'react-native-quick-crypto'
import { decrypt, encrypt, generateRandomBytes } from '../security/aead'
import { DEFAULT_KDF_PARAMS, deriveKey, type KdfParams } from '../security/kdf'

/**
 * CURRENT + 2 previous format generations must remain restorable
 * (migration-strategy.md, FINAL — untouched by ADR-012, this is a
 * data-safety rule, not a security-complexity one). Bump only when the
 * container shape below actually changes.
 */
export const CURRENT_BACKUP_FORMAT_VERSION = 1

const SALT_LENGTH_BYTES = 32

type BackupHeader = {
  formatVersion: number
  schemaVersion: number
  kdfParams: KdfParams
  salt: string // base64
}

type BackupFileShape = BackupHeader & {
  iv: string // base64
  authTag: string // base64
  ciphertext: string // base64
}

export class BackupAuthenticationError extends Error {
  constructor() {
    super(
      'Backup could not be authenticated — wrong password, or the file is corrupted or tampered with.'
    )
    this.name = 'BackupAuthenticationError'
  }
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupFormatError'
  }
}

function headerAad(header: BackupHeader): Uint8Array {
  // Binds the unencrypted header fields to the auth tag (see aead.ts) so
  // tampering with format/schema version or KDF params is also detected,
  // not just tampering with the payload itself.
  return new Uint8Array(Buffer.from(JSON.stringify(header), 'utf8'))
}

/**
 * Encrypts `payload` (an already-serialized snapshot — what gets
 * serialized, and from where, is a later phase's job; this module only
 * knows how to protect bytes it's given) into a single self-contained
 * backup file buffer. Single-tier AES-256-GCM + Argon2id, per ADR-012 —
 * no DEK/KEK split.
 */
export async function createBackup(
  password: string,
  payload: Uint8Array,
  schemaVersion: number,
  kdfParams: KdfParams = DEFAULT_KDF_PARAMS
): Promise<Uint8Array> {
  const salt = generateRandomBytes(SALT_LENGTH_BYTES)
  const key = await deriveKey(password, salt, kdfParams)

  const header: BackupHeader = {
    formatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    schemaVersion,
    kdfParams,
    salt: Buffer.from(salt).toString('base64')
  }

  const encrypted = encrypt(key, payload, headerAad(header))

  const file: BackupFileShape = {
    ...header,
    iv: Buffer.from(encrypted.iv).toString('base64'),
    authTag: Buffer.from(encrypted.authTag).toString('base64'),
    ciphertext: Buffer.from(encrypted.ciphertext).toString('base64')
  }

  return new Uint8Array(Buffer.from(JSON.stringify(file), 'utf8'))
}

export type RestoredBackup = {
  schemaVersion: number
  payload: Uint8Array
}

/**
 * Validates and decrypts a backup file, in the order
 * migration-strategy.md's checklist requires: recognized format →
 * well-formed header → authentication (which also confirms the
 * password) — before any content is trusted. Returns the decrypted
 * payload and the schema version it was created against; checking that
 * version against the CURRENT+2 support window is the caller's job (that
 * policy belongs to restore orchestration, not this crypto module).
 */
export async function restoreBackup(
  password: string,
  fileBytes: Uint8Array
): Promise<RestoredBackup> {
  let file: BackupFileShape
  try {
    file = JSON.parse(Buffer.from(fileBytes).toString('utf8'))
  } catch {
    throw new BackupFormatError('Not a recognized AZAR backup file.')
  }

  if (
    typeof file !== 'object' ||
    file === null ||
    typeof file.formatVersion !== 'number' ||
    typeof file.schemaVersion !== 'number' ||
    typeof file.salt !== 'string' ||
    typeof file.iv !== 'string' ||
    typeof file.authTag !== 'string' ||
    typeof file.ciphertext !== 'string' ||
    typeof file.kdfParams !== 'object'
  ) {
    throw new BackupFormatError('Backup file is missing required fields.')
  }

  if (file.formatVersion > CURRENT_BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError('This backup was created by a newer version of the app.')
  }

  const header: BackupHeader = {
    formatVersion: file.formatVersion,
    schemaVersion: file.schemaVersion,
    kdfParams: file.kdfParams,
    salt: file.salt
  }

  const salt = new Uint8Array(Buffer.from(file.salt, 'base64'))
  const key = await deriveKey(password, salt, file.kdfParams)

  let payload: Uint8Array
  try {
    payload = decrypt(
      key,
      {
        iv: new Uint8Array(Buffer.from(file.iv, 'base64')),
        authTag: new Uint8Array(Buffer.from(file.authTag, 'base64')),
        ciphertext: new Uint8Array(Buffer.from(file.ciphertext, 'base64'))
      },
      headerAad(header)
    )
  } catch {
    throw new BackupAuthenticationError()
  }

  return { schemaVersion: file.schemaVersion, payload }
}
