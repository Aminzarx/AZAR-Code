import { APP_VERSION } from '@shared/appVersion'
import { checkForUpdate } from '../updateService'

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

describe('checkForUpdate', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('returns update info when the latest release is newer and has an APK asset', async () => {
    const [major, minor, patch] = APP_VERSION.split('.').map(Number)
    const newerVersion = `${major}.${minor}.${patch + 1}`
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        tag_name: `v${newerVersion}`,
        body: 'یادداشت انتشار',
        assets: [{ name: 'azar.apk', browser_download_url: 'https://example.test/azar.apk' }]
      })
    )

    const update = await checkForUpdate()

    expect(update).toEqual({
      version: newerVersion,
      downloadUrl: 'https://example.test/azar.apk',
      releaseNotes: 'یادداشت انتشار'
    })
  })

  it('returns null when the latest release is not newer than the running version', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        tag_name: `v${APP_VERSION}`,
        assets: [{ name: 'azar.apk', browser_download_url: 'https://example.test/azar.apk' }]
      })
    )

    expect(await checkForUpdate()).toBeNull()
  })

  it('returns null when the release has no APK asset', async () => {
    const [major, minor, patch] = APP_VERSION.split('.').map(Number)
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        tag_name: `v${major}.${minor}.${patch + 1}`,
        assets: [{ name: 'source.zip', browser_download_url: 'https://example.test/source.zip' }]
      })
    )

    expect(await checkForUpdate()).toBeNull()
  })

  it('returns null on a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    expect(await checkForUpdate()).toBeNull()
  })

  it('returns null on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, {}))
    expect(await checkForUpdate()).toBeNull()
  })

  it('returns null on a malformed JSON response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json')
      }
    } as unknown as Response)
    expect(await checkForUpdate()).toBeNull()
  })
})
