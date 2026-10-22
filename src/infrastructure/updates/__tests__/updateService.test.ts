import { APP_VERSION } from '@shared/appVersion'
import { checkForUpdate, KSS_MANIFEST_URL } from '../updateService'

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const [major, minor, patch] = APP_VERSION.split('.').map(Number)
const newer = `${major}.${minor}.${patch + 1}`
const SHA = 'AB'.repeat(32)
const URL_OK = `https://api.zarandix.ir/app/azar-${newer}.apk`

describe('checkForUpdate (KSS server only — v1.2.0, Amin #4223)', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('returns the update from the KSS file when it is newer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { version: `v${newer}`, url: URL_OK, sha256: SHA, notes: 'n' })
    )
    expect(await checkForUpdate()).toEqual({
      version: newer,
      downloadUrl: URL_OK,
      sha256: SHA.toLowerCase(),
      releaseNotes: 'n'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(KSS_MANIFEST_URL)
  })

  it('returns null when the KSS file is not newer', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { version: APP_VERSION, url: URL_OK, sha256: SHA })
    )
    expect(await checkForUpdate()).toBeNull()
  })

  it('never asks GitHub, even when the KSS file cannot be read', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, {}))
    expect(await checkForUpdate()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an install link outside the KSS folder', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        version: newer,
        url: 'https://github.com/x/releases/download/v9/azar.apk',
        sha256: SHA
      })
    )
    expect(await checkForUpdate()).toBeNull()
  })

  it('rejects a file without a valid checksum', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { version: newer, url: URL_OK, sha256: 'abc' }))
    expect(await checkForUpdate()).toBeNull()
  })

  it('returns null on a network failure or malformed JSON', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    expect(await checkForUpdate()).toBeNull()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json')
      }
    } as unknown as Response)
    expect(await checkForUpdate()).toBeNull()
  })
})
