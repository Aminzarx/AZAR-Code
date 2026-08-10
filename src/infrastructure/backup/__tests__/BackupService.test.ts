import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '../../database/migrationRunner'
import { restoreBackup } from '../backupFile'
import { createBackupFile } from '../BackupService'

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
