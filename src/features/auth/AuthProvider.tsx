import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import RNFS from 'react-native-fs'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { SessionRepository } from '@infrastructure/database/repositories/SessionRepository'
import {
  HttpAuthApiClient,
  type InviteResult,
  type SupportContacts
} from '@infrastructure/auth/httpAuthApiClient'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { generateId } from '@infrastructure/auth/idGenerators'
import { keychainSecureStorage } from '@infrastructure/security/keychainSecureStorage'
import { SessionManager, type CurrentSession } from '@core/auth/sessionManager'
import { SyncService, type SyncFiles } from '@infrastructure/sync/SyncService'
import {
  SessionRevokedError,
  StorageFullError,
  SyncApiClient,
  type SyncUsage
} from '@infrastructure/sync/syncApiClient'

/** AZAR-SYNC-001: where the account's files stand against the server. */
export type SyncStatus = {
  state: 'idle' | 'syncing' | 'offline' | 'full'
  /** changes made on this phone that have not reached the server yet */
  pending: number
  /** the account's space on the server, as the server last reported it */
  usage: SyncUsage | null
}

const SYNC_EVERY_MS = 3000

const rnfsFiles: SyncFiles = {
  dir: RNFS.DocumentDirectoryPath,
  readBase64: (path) => RNFS.readFile(path, 'base64'),
  writeBase64: async (path, base64) => {
    await RNFS.mkdir(path.slice(0, path.lastIndexOf('/')))
    await RNFS.writeFile(path, base64, 'base64')
  },
  remove: (path) => RNFS.unlink(path)
}

type AuthContextValue = {
  isInitializing: boolean
  session: CurrentSession | null
  sendOtp: (phoneNumber: string) => Promise<void>
  verifyOtp: (phoneNumber: string, code: string) => Promise<void>
  register: (phoneNumber: string, referralCode: string) => Promise<CurrentSession>
  login: (phoneNumber: string) => Promise<CurrentSession>
  logout: () => Promise<void>
  deleteAccount: (phoneNumber: string) => Promise<void>
  /** v1.4.0: invite a colleague's mobile; returns the link to send by SMS */
  createInvite: (phoneNumber: string) => Promise<InviteResult>
  /** v1.5.0: move the account to a new number already confirmed with its code */
  changePhone: (newPhoneNumber: string) => Promise<void>
  /** v1.5.0: the support contacts set on the server */
  getSupportContacts: () => Promise<SupportContacts>
  /** AZAR-SYNC-001: the account's files on the server */
  sync: SyncStatus
  /** sends what is waiting now; returns how many changes are still not on the server */
  syncNow: () => Promise<number>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isInitializing, setIsInitializing] = useState(true)
  const [session, setSession] = useState<CurrentSession | null>(null)
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null)
  const [authApiClient, setAuthApiClient] = useState<HttpAuthApiClient | null>(null)
  const [userRepository, setUserRepository] = useState<UserRepository | null>(null)
  const [syncService, setSyncService] = useState<SyncService | null>(null)
  const [sync, setSync] = useState<SyncStatus>(IDLE_SYNC)
  // one sync step at a time: a push never runs while sign-out wipes the phone
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const exclusive = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(work, work)
    queue.current = next.catch(() => undefined)
    return next
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const db = await getDatabase()
      const client = new HttpAuthApiClient(AUTH_API_BASE_URL)
      const manager = new SessionManager(
        client,
        new SessionRepository(db),
        keychainSecureStorage,
        generateId
      )
      const currentSession = await manager.getCurrentSession()

      if (cancelled) {
        return
      }
      setAuthApiClient(client)
      setUserRepository(new UserRepository(db))
      setSessionManager(manager)
      setSyncService(new SyncService(db, new SyncApiClient(AUTH_API_BASE_URL), rnfsFiles))
      setSession(currentSession)
      setIsInitializing(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  /** One round: bring the account's files back if still owed, then send what is waiting. */
  const syncOnce = useCallback(
    (current: CurrentSession): Promise<number> =>
      exclusive(async () => {
        if (!syncService) return 0
        try {
          if ((await syncService.getState('restore_needed')) === '1') {
            setSync((s) => ({ ...s, state: 'syncing' }))
            await syncService.restore(current.sessionToken, current.userId)
            await syncService.setState('restore_needed', null)
          }
          if ((await syncService.pendingCount()) > 0) {
            setSync((s) => ({ ...s, state: 'syncing' }))
            await syncService.push(current.sessionToken, current.userId)
          }
          const pending = await syncService.pendingCount()
          setSync({ state: 'idle', pending, usage: await syncService.lastUsage() })
          return pending
        } catch (error) {
          if (error instanceof SessionRevokedError) {
            // another phone signed in with this number: this phone signs out. Files that never
            // reached the server stay here until the same number signs in again.
            if ((await syncService.pendingCount()) === 0) await syncService.wipe()
            await sessionManager?.logout()
            setSession(null)
            setSync(IDLE_SYNC)
            return 0
          }
          const pending = await syncService.pendingCount().catch(() => 0)
          setSync({
            state: error instanceof StorageFullError ? 'full' : 'offline',
            pending,
            usage: await syncService.lastUsage().catch(() => null)
          })
          return pending
        }
      }),
    [exclusive, syncService, sessionManager]
  )

  useEffect(() => {
    if (!session || !syncService) return
    let stopped = false
    const tick = (): void => {
      if (!stopped) syncOnce(session).catch(() => undefined)
    }
    tick()
    const timer = setInterval(tick, SYNC_EVERY_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [session, syncService, syncOnce])

  const value = useMemo<AuthContextValue | null>(() => {
    if (!sessionManager || !authApiClient || !syncService) {
      return null
    }

    // The server (ADR-009) is the source of truth for phone/referral-code
    // facts; this just mirrors the returned user into the local database so
    // screens that already read a phone number/referral code locally
    // (SettingsScreen) keep working unchanged. Not a cache of anything else
    // — no business data lives here.
    async function cacheUserLocally(
      phoneNumber: string,
      result: { userId: string; referralCode: string }
    ): Promise<void> {
      if (!userRepository) {
        return
      }
      const existing = await userRepository.findById(result.userId)
      if (existing) {
        return
      }
      await userRepository.create({
        id: result.userId,
        phoneNumber,
        referralCode: result.referralCode
      })
    }

    /**
     * Before the app opens for a number: files of another account are removed (they are on the
     * server already), and a phone with no files gets the account's files back from the server.
     */
    async function prepareFiles(result: CurrentSession): Promise<void> {
      if (!syncService) return
      await exclusive(async () => {
        const owner = await syncService.owner()
        if (owner && owner !== result.userId) await syncService.wipe()
        if (await syncService.hasLocalFiles()) return
        try {
          await syncService.restore(result.sessionToken, result.userId)
        } catch {
          await syncService.setState('restore_needed', '1') // offline: the sync round tries again
        }
      })
    }

    async function signOutHere(): Promise<void> {
      await exclusive(async () => {
        await syncService?.wipe()
        await sessionManager?.logout()
      })
      setSession(null)
      setSync(IDLE_SYNC)
    }

    return {
      isInitializing,
      session,
      sync,
      syncNow: () => (session ? syncOnce(session) : Promise.resolve(0)),
      sendOtp: (phoneNumber) => authApiClient.sendOtp(phoneNumber),
      verifyOtp: (phoneNumber, code) => authApiClient.verifyOtp(phoneNumber, code),
      register: async (phoneNumber, referralCode) => {
        const result = await sessionManager.register(phoneNumber, referralCode, (resolved) =>
          cacheUserLocally(phoneNumber, resolved)
        )
        await prepareFiles(result)
        setSession(result)
        return result
      },
      login: async (phoneNumber) => {
        const result = await sessionManager.login(phoneNumber, (resolved) =>
          cacheUserLocally(phoneNumber, resolved)
        )
        await prepareFiles(result)
        setSession(result)
        return result
      },
      // AZAR-SYNC-001: signing out removes the files from this phone; they stay on the account
      logout: signOutHere,
      deleteAccount: async (phoneNumber) => {
        await authApiClient.deleteAccount(phoneNumber)
        await signOutHere()
      },
      createInvite: async (phoneNumber) => {
        if (!session) {
          throw new Error('Not signed in.')
        }
        return authApiClient.createInvite(session.sessionToken, phoneNumber)
      },
      changePhone: async (newPhoneNumber) => {
        if (!session) {
          throw new Error('Not signed in.')
        }
        const result = await authApiClient.changePhone(session.sessionToken, newPhoneNumber)
        await userRepository?.updatePhoneNumber(session.userId, result.phoneNumber)
      },
      getSupportContacts: () => authApiClient.getSupportContacts()
    }
  }, [authApiClient, sessionManager, session, isInitializing, userRepository, syncService, sync, syncOnce, exclusive])

  return (
    <AuthContext.Provider value={value ?? { ...placeholderValue, isInitializing: true }}>
      {children}
    </AuthContext.Provider>
  )
}

const IDLE_SYNC: SyncStatus = { state: 'idle', pending: 0, usage: null }

const placeholderValue: AuthContextValue = {
  isInitializing: true,
  session: null,
  sync: IDLE_SYNC,
  syncNow: () => Promise.resolve(0),
  sendOtp: () => Promise.reject(new Error('Auth is still initializing.')),
  verifyOtp: () => Promise.reject(new Error('Auth is still initializing.')),
  register: () => Promise.reject(new Error('Auth is still initializing.')),
  login: () => Promise.reject(new Error('Auth is still initializing.')),
  logout: () => Promise.reject(new Error('Auth is still initializing.')),
  deleteAccount: () => Promise.reject(new Error('Auth is still initializing.')),
  createInvite: () => Promise.reject(new Error('Auth is still initializing.')),
  changePhone: () => Promise.reject(new Error('Auth is still initializing.')),
  getSupportContacts: () => Promise.reject(new Error('Auth is still initializing.'))
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
