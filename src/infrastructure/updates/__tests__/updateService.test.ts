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

  describe('KSS server first (v1.1.0, Amin #4216)', () => {
    const [major, minor, patch] = APP_VERSION.split('.').map(Number)
    const newer = `${major}.${minor}.${patch + 1}`

    it('uses the KSS update file when it is readable', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { version: newer, url: 'https://api.zarandix.ir/app/a.apk', notes: 'n' })
      )
      expect(await checkForUpdate()).toEqual({
        version: newer,
        downloadUrl: 'https://api.zarandix.ir/app/a.apk',
        releaseNotes: 'n'
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.zarandix.ir/app/update.json')
    })

    it('does not ask GitHub when the KSS file says nothing is newer', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { version: APP_VERSION, url: 'https://api.zarandix.ir/app/a.apk' })
      )
      expect(await checkForUpdate()).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('falls back to GitHub when the KSS file cannot be read', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(502, {})).mockResolvedValueOnce(
        jsonResponse(200, {
          tag_name: `v${newer}`,
          assets: [{ name: 'azar.apk', browser_download_url: 'https://example.test/azar.apk' }]
        })
      )
      expect((await checkForUpdate())?.downloadUrl).toBe('https://example.test/azar.apk')
    })

    it('ignores a KSS file whose link is not https', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { version: newer, url: 'http://x/a.apk' }))
        .mockResolvedValueOnce(jsonResponse(404, {}))
      expect(await checkForUpdate()).toBeNull()
    })
  })
})
