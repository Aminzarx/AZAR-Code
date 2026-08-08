import {
  BackupAuthenticationError,
  BackupFormatError,
  createBackup,
  restoreBackup,
  CURRENT_BACKUP_FORMAT_VERSION
} from '../backupFile'

// Small KDF params for fast tests — production defaults are unaffected.
const FAST_KDF_PARAMS = { memoryKiB: 1024, iterations: 1, parallelism: 1, hashLengthBytes: 32 }

describe('backupFile', () => {
  it('round-trips a payload through createBackup/restoreBackup', async () => {
    const payload = new TextEncoder().encode('serialized local database snapshot')
    const file = await createBackup('correct password', payload, 1, FAST_KDF_PARAMS)

    const restored = await restoreBackup('correct password', file)

    expect(new TextDecoder().decode(restored.payload)).toBe('serialized local database snapshot')
    expect(restored.schemaVersion).toBe(1)
  })

  it('rejects the wrong password with BackupAuthenticationError', async () => {
    const payload = new TextEncoder().encode('data')
    const file = await createBackup('right password', payload, 1, FAST_KDF_PARAMS)

    await expect(restoreBackup('wrong password', file)).rejects.toThrow(BackupAuthenticationError)
  })

  it('rejects a tampered backup file with BackupAuthenticationError', async () => {
    const payload = new TextEncoder().encode('data')
    const file = await createBackup('password', payload, 1, FAST_KDF_PARAMS)

    const tampered = JSON.parse(Buffer.from(file).toString('utf8'))
    tampered.ciphertext = Buffer.from('tampered-ciphertext-not-base64-of-original').toString(
      'base64'
    )
    const tamperedBytes = new TextEncoder().encode(JSON.stringify(tampered))

    await expect(restoreBackup('password', tamperedBytes)).rejects.toThrow(
      BackupAuthenticationError
    )
  })

  it('rejects tampering with unencrypted header fields (AAD binding)', async () => {
    const payload = new TextEncoder().encode('data')
    const file = await createBackup('password', payload, 1, FAST_KDF_PARAMS)

    const tampered = JSON.parse(Buffer.from(file).toString('utf8'))
    tampered.schemaVersion = 999 // flip a header field without re-encrypting
    const tamperedBytes = new TextEncoder().encode(JSON.stringify(tampered))

    await expect(restoreBackup('password', tamperedBytes)).rejects.toThrow(
      BackupAuthenticationError
    )
  })

  it('rejects a file that is not recognizable JSON with BackupFormatError', async () => {
    const garbage = new TextEncoder().encode('this is not a backup file')
    await expect(restoreBackup('password', garbage)).rejects.toThrow(BackupFormatError)
  })

  it('rejects a backup from a newer, unsupported format version', async () => {
    const payload = new TextEncoder().encode('data')
    const file = await createBackup('password', payload, 1, FAST_KDF_PARAMS)
    const parsed = JSON.parse(Buffer.from(file).toString('utf8'))
    parsed.formatVersion = CURRENT_BACKUP_FORMAT_VERSION + 1
    const futureBytes = new TextEncoder().encode(JSON.stringify(parsed))

    await expect(restoreBackup('password', futureBytes)).rejects.toThrow(BackupFormatError)
  })

  it('rejects a file missing required fields', async () => {
    const incomplete = new TextEncoder().encode(JSON.stringify({ formatVersion: 1 }))
    await expect(restoreBackup('password', incomplete)).rejects.toThrow(BackupFormatError)
  })
})
