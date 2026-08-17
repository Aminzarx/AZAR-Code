import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { UserRepository } from '../../database/repositories/UserRepository'
import { BackupAuthenticationError, createBackup, restoreBackup } from '../backupFile'
import { createBackupFile, restoreBackupFile, RestoreSchemaTooNewError } from '../BackupService'

const mockWrittenFiles = new Map<string, string>()

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    CachesDirectoryPath: '/fake/caches',
    writeFile: jest.fn((path: string, content: string) => {
      mockWrittenFiles.set(path, content)
      return Promise.resolve()
    })
  }
}))

describe('createBackupFile', () => {
  let db: DB

  beforeEach(async () => {
    mockWrittenFiles.clear()
    db = open({ name: `test-backup-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('writes a password-protected backup file that restores the current schema version', async () => {
    const path = await createBackupFile(db, 'a strong password')

    expect(path).toMatch(/^\/fake\/caches\/azar-backup-\d{8}-\d{6}\.azarbackup$/)
    const base64Content = mockWrittenFiles.get(path)
    expect(base64Content).toBeTruthy()

    const fileBytes = new Uint8Array(Buffer.from(base64Content as string, 'base64'))
    const restored = await restoreBackup('a strong password', fileBytes)
    const snapshot = JSON.parse(new TextDecoder().decode(restored.payload))

    expect(restored.schemaVersion).toBeGreaterThan(0)
    expect(snapshot.tables.users.length).toBeGreaterThan(0)
  })
})

describe('restoreBackupFile', () => {
  let db: DB

  beforeEach(async () => {
    mockWrittenFiles.clear()
    db = open({ name: `test-backup-restore-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
  })

  afterEach(() => {
    db.close()
  })

  it('round-trips: creates a backup, wipes the live data, and restores it back', async () => {
    const userRepository = new UserRepository(db)
    await userRepository.create({
      id: 'user-1',
      phoneNumber: '+989121234567',
      referralCode: 'ORIGCODE'
    })

    const path = await createBackupFile(db, 'a strong password')
    const base64Content = mockWrittenFiles.get(path) as string
    const fileBytes = new Uint8Array(Buffer.from(base64Content, 'base64'))

    // Simulates data changing on-device between backup and restore — the
    // restored copy should win, proving this actually replaces data
    // rather than just decrypting it.
    await userRepository.create({
      id: 'user-2',
      phoneNumber: '+989127654321',
      referralCode: 'LATERCODE'
    })

    await restoreBackupFile(db, 'a strong password', fileBytes)

    expect(await userRepository.findById('user-1')).toEqual(
      expect.objectContaining({ phoneNumber: '+989121234567' })
    )
    expect(await userRepository.findById('user-2')).toBeNull()
  })

  it('rejects the wrong password without touching the live database', async () => {
    const userRepository = new UserRepository(db)
    await userRepository.create({
      id: 'user-1',
      phoneNumber: '+989121234567',
      referralCode: 'ORIGCODE'
    })

    const path = await createBackupFile(db, 'a strong password')
    const base64Content = mockWrittenFiles.get(path) as string
    const fileBytes = new Uint8Array(Buffer.from(base64Content, 'base64'))

    await expect(restoreBackupFile(db, 'the wrong password', fileBytes)).rejects.toThrow(
      BackupAuthenticationError
    )
    expect(await userRepository.findById('user-1')).not.toBeNull()
  })

  it('rejects a backup whose schema version is newer than the live database supports', async () => {
    // Built directly with `createBackup` (rather than by editing an
    // already-created file's JSON) so the header's schemaVersion stays
    // correctly bound into the auth tag — otherwise this would exercise
    // BackupAuthenticationError instead of the schema-version check this
    // test actually targets, since headerAad binds schemaVersion too.
    const payload = new TextEncoder().encode(JSON.stringify({ schemaVersion: 999999, tables: {} }))
    const futureBackupBytes = await createBackup('a strong password', payload, 999999)

    await expect(restoreBackupFile(db, 'a strong password', futureBackupBytes)).rejects.toThrow(
      RestoreSchemaTooNewError
    )
  })
})
