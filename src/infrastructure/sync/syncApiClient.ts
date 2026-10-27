import NetInfo from '@react-native-community/netinfo'
import { NetworkFailureError } from '../../core/auth/errors'
import type { TokenLedger } from '@features/settings/services/tokenLedger'
import {
  PurchaseRefusedError,
  type PurchaseOffer,
  type TokenOrder
} from '@features/settings/services/tokenPurchase'

/**
 * a request the network never answers counts as offline after this long (React Native's fetch has no timeout).
 * It only covers waiting for the server to start answering: a large download is not cut off.
 */
const REQUEST_TIMEOUT_MS = 8000

/** One change sent to the server: the row as the phone has it now, or null when it was deleted. */
export type SyncChange = { t: string; k: string; row: Record<string, unknown> | null }
export type SyncUsage = { bytes: number; quotaBytes: number }
export type PullResult = { rows: SyncChange[]; blobs: string[]; usage: SyncUsage }

/** The session is no longer valid: another phone signed in with this number, or the account is gone. */
/** Amin #5370: a note from KSS to the app's users; its tone picks the colour */
export type Announcement = {
  id: string
  title: string
  body: string
  tone: 'info' | 'success' | 'warning' | 'danger'
  createdAt: string
}

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

  /** Amin #5052: the account's token ledger (summary + latest rows) */
  tokenLedger(sessionToken: string): Promise<TokenLedger> {
    return this.post('/tokens/ledger', { sessionToken })
  }

  /** Amin #5370: KSS announcements this account has not dismissed, newest first */
  announcements(sessionToken: string): Promise<{ announcements: Announcement[] }> {
    return this.post('/announcements', { sessionToken })
  }

  /** Amin #5370: × on an announcement — it is not shown to this account again */
  dismissAnnouncement(sessionToken: string, id: string): Promise<unknown> {
    return this.post(`/announcements/${encodeURIComponent(id)}/dismiss`, { sessionToken })
  }

  /** Amin #5245: the price for `tokens` (or only whether buying is open) */
  purchaseQuote(sessionToken: string, tokens?: number): Promise<PurchaseOffer> {
    return this.post('/tokens/purchase/quote', { sessionToken, tokens })
  }

  /** Amin #5245: makes the order; the same key again returns the same order (never a second one) */
  purchaseTokens(sessionToken: string, tokens: number, key: string): Promise<{ order: TokenOrder; payUrl: string | null }> {
    return this.post('/tokens/purchase', { sessionToken, tokens }, { 'Idempotency-Key': key })
  }

  purchaseStatus(sessionToken: string, orderId: string): Promise<{ order: TokenOrder }> {
    return this.post('/tokens/purchase/status', { sessionToken, orderId })
  }

  /** the paid purchases (receipts), newest first */
  tokenPurchases(sessionToken: string): Promise<{ purchases: TokenOrder[] }> {
    return this.post('/tokens/purchases', { sessionToken })
  }

  private async post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
    // offline (airplane mode, no network): say so at once instead of waiting on a request that cannot go out
    const network = await NetInfo.fetch().catch(() => null)
    if (
      network &&
      (network.isConnected === false ||
        network.type === 'none' ||
        network.isInternetReachable === false)
    ) {
      throw new NetworkFailureError()
    }
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
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
    // Amin #5052: the token ledger refuses a change that does not fit (tokens_short); same «full» state for the user
    if (parsed.error?.code === 'storage_full' || parsed.error?.code === 'tokens_short') throw new StorageFullError()
    // Amin #5245: a purchase step the server refuses with a reason the screen can say in words
    if (path.startsWith('/tokens/purchase') && parsed.error?.code && response.status !== 429) {
      throw new PurchaseRefusedError(parsed.error.code)
    }
    throw new NetworkFailureError()
  }
}
