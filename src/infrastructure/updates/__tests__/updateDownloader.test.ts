import RNFS from 'react-native-fs'
import { downloadUpdate, UPDATES_DIR } from '../updateDownloader'

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/files',
  mkdir: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
  exists: jest.fn(),
  hash: jest.fn(),
  unlink: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn()
}))

const fs = RNFS as jest.Mocked<typeof RNFS>
const SHA = 'c'.repeat(64)
const UPDATE = {
  version: '9.0.0',
  downloadUrl: 'https://api.zarandix.ir/app/azar-9.0.0.apk',
  sha256: SHA,
  releaseNotes: ''
}
const TARGET = `${UPDATES_DIR}/azar-9.0.0.apk`

function downloadResult(statusCode: number): ReturnType<typeof RNFS.downloadFile> {
  return { jobId: 1, promise: Promise.resolve({ jobId: 1, statusCode, bytesWritten: 10 }) }
}

describe('downloadUpdate (v1.2.0, Amin #4223)', () => {
  afterEach(() => {
    jest.clearAllMocks()
    fs.readDir.mockResolvedValue([])
  })

  it('downloads into the private updates folder and keeps a file whose checksum matches', async () => {
    fs.exists.mockImplementation(async (p) => p.endsWith('.part'))
    fs.hash.mockResolvedValue(SHA)
    fs.downloadFile.mockReturnValue(downloadResult(200))

    expect(await downloadUpdate(UPDATE)).toBe(TARGET)
    expect(fs.downloadFile).toHaveBeenCalledWith(
      expect.objectContaining({ fromUrl: UPDATE.downloadUrl, toFile: `${TARGET}.part` })
    )
    expect(fs.moveFile).toHaveBeenCalledWith(`${TARGET}.part`, TARGET)
  })

  it('reuses an already downloaded, matching file without downloading again', async () => {
    fs.exists.mockResolvedValue(true)
    fs.hash.mockResolvedValue(SHA)

    expect(await downloadUpdate(UPDATE)).toBe(TARGET)
    expect(fs.downloadFile).not.toHaveBeenCalled()
  })

  it('throws away a file with the wrong checksum', async () => {
    fs.exists.mockImplementation(async (p) => p.endsWith('.part'))
    fs.hash.mockResolvedValue('d'.repeat(64))
    fs.downloadFile.mockReturnValue(downloadResult(200))

    expect(await downloadUpdate(UPDATE)).toBeNull()
    expect(fs.unlink).toHaveBeenCalledWith(`${TARGET}.part`)
    expect(fs.moveFile).not.toHaveBeenCalled()
  })

  it('returns null when the server answers with an error', async () => {
    fs.exists.mockResolvedValue(false)
    fs.downloadFile.mockReturnValue(downloadResult(404))

    expect(await downloadUpdate(UPDATE)).toBeNull()
  })

  it('removes older update files but keeps the current one', async () => {
    fs.exists.mockResolvedValue(true)
    fs.hash.mockResolvedValue(SHA)
    fs.readDir.mockResolvedValue([
      { path: `${UPDATES_DIR}/azar-8.0.0.apk` },
      { path: TARGET }
    ] as Awaited<ReturnType<typeof RNFS.readDir>>)

    await downloadUpdate(UPDATE)
    expect(fs.unlink).toHaveBeenCalledWith(`${UPDATES_DIR}/azar-8.0.0.apk`)
    expect(fs.unlink).not.toHaveBeenCalledWith(TARGET)
  })
})
