import NetInfo from '@react-native-community/netinfo'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { SessionRevokedError } from '@infrastructure/sync/syncApiClient'
import type { SharedFile } from '../shareFile'

/**
 * Amin #6339/#6341: the two calls of protected file sharing (server/src/shareRoutes.js). Kept apart from
 * SyncApiClient: a share carries photos (a longer wait is allowed) and every refusal has the server's Persian sentence.
 */
const REQUEST_TIMEOUT_MS = 30000

export const SHARE_NETWORK_TEXT = 'انجام نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.'

/** the server refused (used, expired, unknown, your own link…); `message` is its Persian sentence */
export class ShareRefusedError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ShareRefusedError'
  }
}

export type CreatedShare = { code: string; link: string; expiresAt: string }
export type ReceivedShare = { file: SharedFile; sharedAt: string }

async function post<T>(path: string, body: unknown): Promise<T> {
  const network = await NetInfo.fetch().catch(() => null)
  if (network && (network.isConnected === false || network.type === 'none' || network.isInternetReachable === false)) {
    throw new ShareRefusedError('offline', SHARE_NETWORK_TEXT)
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal
    })
  } catch {
    throw new ShareRefusedError('offline', SHARE_NETWORK_TEXT)
  } finally {
    clearTimeout(timer)
  }
  if (response.ok) return (await response.json()) as T
  const parsed = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } }
  if (response.status === 401) throw new SessionRevokedError()
  if (response.status === 429 && !parsed.error?.message) {
    throw new ShareRefusedError('rate_limited', 'چند بار پشت هم تلاش شد. چند دقیقه بعد دوباره امتحان کنید.')
  }
  if (response.status === 413) {
    throw new ShareRefusedError('too_large', 'عکس‌های این فایل برای اشتراک زیاد است. «پنهان کردن عکس‌ها» را روشن کنید و دوباره بسازید.')
  }
  throw new ShareRefusedError(parsed.error?.code ?? 'failed', parsed.error?.message || SHARE_NETWORK_TEXT)
}

export function createShare(sessionToken: string, file: SharedFile): Promise<CreatedShare> {
  return post('/share/create', { sessionToken, file })
}

export function receiveShare(sessionToken: string, code: string): Promise<ReceivedShare> {
  return post('/share/receive', { sessionToken, code })
}

/** a refusal's sentence for the screen */
export function shareErrorText(error: unknown): string {
  if (error instanceof ShareRefusedError) return error.message
  if (error instanceof SessionRevokedError) return 'نشست شما تمام شده است. دوباره وارد شوید.'
  return SHARE_NETWORK_TEXT
}
