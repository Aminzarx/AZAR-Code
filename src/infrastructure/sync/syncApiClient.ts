import NetInfo from '@react-native-community/netinfo'
import { NetworkFailureError } from '../../core/auth/errors'

/** a request the network never answers counts as offline after this long (React Native's fetch has no timeout) */
const REQUEST_TIMEOUT_MS = 15000

/** One change sent to the server: the row as the phone has it now, or null when it was deleted. */
export type SyncChange = { t: string; k: string; row: Record<string, unknown> | null }
export type SyncUsage = { bytes: number; quotaBytes: number; tokens: number }
export type PullResult = { rows: SyncChange[]; blobs: string[]; usage: SyncUsage }

/** The session is no longer valid: another phone signed in with this number, or the account is gone. */
export class SessionRevokedError extends Error {
  constructor() {
    super('session_revoked')
    this.name = 'SessionRevokedError'
  }
}

/** The account's storage tokens are used up; the change stays on the phone until space is freed. */
export class StorageFullError extends Error {
  constructor() {
    super('storage_full')
    this.name = 'StorageFullError'
  }
}

type ErrorBody = { error?: { code?: string; message?: string } }

/**
 * AZAR-SYNC-001: the account's files on the KSS server (server/src/syncRoutes.js).
 * Every call carries the session token; the server keeps rows and photos per account, encrypted.
 */
export class SyncApiClient {
  constructor(private readonly baseUrl: string) {}

  push(sessionToken: string, changes: SyncChange[]): Promise<{ usage: SyncUsage }> {
    return this.post('/sync/push', { sessionToken, changes })
  }

  pull(sessionToken: string): Promise<PullResult> {
    return this.post('/sync/pull', { sessionToken })
  }

  usage(sessionToken: string): Promise<{ usage: SyncUsage }> {
    return this.post('/sync/usage', { sessionToken })
  }

  putBlob(sessionToken: string, base64: string): Promise<{ hash: string; usage: SyncUsage }> {
    return this.post('/sync/blob/put', { sessionToken, data: base64 })
  }

  getBlob(sessionToken: string, hash: string): Promise<{ data: string }> {
    return this.post('/sync/blob/get', { sessionToken, hash })
  }

  deleteBlob(sessionToken: string, hash: string): Promise<{ usage: SyncUsage }> {
    return this.post('/sync/blob/delete', { sessionToken, hash })
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    // offline (airplane mode, no network): say so at once instead of waiting on a request that cannot go out
    const network = await NetInfo.fetch().catch(() => null)
    if (network?.isConnected === false) throw new NetworkFailureError()
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.signal
      })
    } catch {
      throw new NetworkFailureError()
    } finally {
      clearTimeout(timer)
    }
    if (response.ok) {
      return (await response.json()) as T
    }
    const parsed = (await response.json().catch(() => ({}))) as ErrorBody
    if (response.status === 401) throw new SessionRevokedError()
    if (parsed.error?.code === 'storage_full') throw new StorageFullError()
    throw new NetworkFailureError()
  }
}
