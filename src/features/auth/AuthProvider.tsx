import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import RNFS from 'react-native-fs'
import { getDatabase, getDeviceStore } from '@infrastructure/database/connection'
import { bumpFilesVersion } from '@infrastructure/sync/filesVersion'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { ApplicationSettingsRepository } from '@infrastructure/database/repositories/ApplicationSettingsRepository'
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
  /** option A (Amin #4826): the account's files came from the server in this run (else only what was made offline) */
  loaded: boolean
  /** the first round after start or sign-in has finished (loaded, or found the phone offline) */
  settled: boolean
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
  /** `profile`: the name and agency typed at sign-up; kept once this phone holds the account's files */
  register: (
    phoneNumber: string,
    referralCode: string,
    profile?: SignUpProfile
  ) => Promise<CurrentSession>
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
  /** Amin #5062: a file/contract photo's bytes (base64) for showing; null while it cannot be fetched (offline) */
  loadPhoto: (photo: { data: string | null; blobHash: string | null }) => Promise<string | null>
}

export type SignUpProfile = { displayName?: string; agencyName?: string }

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
      const service = new SyncService(db, await getDeviceStore(), new SyncApiClient(AUTH_API_BASE_URL), rnfsFiles)
      if (currentSession) await service.claim(currentSession.userId)
      if (cancelled) {
        return
      }
      setSyncService(service)
      setSession(currentSession)
      setIsInitializing(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * One round: send what is waiting (it then leaves the phone), and — while the account's files have not come
   * from the server in this run (start, sign-in while offline) — bring them into the working database.
   */
  const syncOnce = useCallback(
    (current: CurrentSession): Promise<number> =>
      exclusive(async () => {
        if (!syncService) return 0
        try {
          if ((await syncService.pendingCount()) > 0) {
            setSync((s) => ({ ...s, state: 'syncing' }))
            await syncService.push(current.sessionToken, current.userId)
          }
          if (!syncService.loaded) {
            setSync((s) => ({ ...s, state: 'syncing' }))
            await syncService.restore(current.sessionToken, current.userId)
            bumpFilesVersion()
          }
          const pending = await syncService.pendingCount()
          setSync({ state: 'idle', pending, usage: await syncService.lastUsage(), loaded: true, settled: true })
          return pending
        } catch (error) {
          if (error instanceof SessionRevokedError) {
            // another phone signed in with this number: this phone signs out. Changes that never
            // reached the server stay queued (encrypted) until the same number signs in again.
            if ((await syncService.pendingCount()) === 0) await syncService.wipe()
            else await syncService.forget()
            await sessionManager?.logout()
            setSession(null)
            setSync(IDLE_SYNC)
            return 0
          }
          const pending = await syncService.pendingCount().catch(() => 0)
          setSync({
            state: error instanceof StorageFullError ? 'full' : 'offline',
            pending,
            usage: await syncService.lastUsage().catch(() => null),
            loaded: syncService.loaded,
            settled: true
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
     * Before the app opens for a number (Amin #4826): another account's files leave the working database, and
     * this account's files come from the server. Offline, only what was made here offline shows; the sync
     * round brings the rest as soon as the phone is online.
     */
    async function prepareFiles(result: CurrentSession): Promise<void> {
      if (!syncService) return
      setSync({ ...IDLE_SYNC, settled: false })
      await exclusive(async () => {
        await syncService.claim(result.userId)
        try {
          await syncService.restore(result.sessionToken, result.userId)
          setSync({ ...IDLE_SYNC, loaded: true, settled: true, usage: await syncService.lastUsage() })
        } catch {
          setSync({ ...IDLE_SYNC, state: 'offline', settled: true }) // the sync round tries again
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
      loadPhoto: (photo) =>
        photo.data
          ? Promise.resolve(photo.data)
          : session && syncService
            ? syncService.loadPhoto(session.sessionToken, photo)
            : Promise.resolve(null),
      sendOtp: (phoneNumber) => authApiClient.sendOtp(phoneNumber),
      verifyOtp: (phoneNumber, code) => authApiClient.verifyOtp(phoneNumber, code),
      register: async (phoneNumber, referralCode, profile) => {
        const result = await sessionManager.register(phoneNumber, referralCode, (resolved) =>
          cacheUserLocally(phoneNumber, resolved)
        )
        await prepareFiles(result)
        // after prepareFiles: switching the phone to this account clears the previous account's profile
        const settings = new ApplicationSettingsRepository(await getDatabase())
        if (profile?.displayName) await settings.set('display_name', profile.displayName)
        if (profile?.agencyName) await settings.set('agency_name', profile.agencyName)
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

const IDLE_SYNC: SyncStatus = { state: 'idle', pending: 0, usage: null, loaded: false, settled: false }

const placeholderValue: AuthContextValue = {
  isInitializing: true,
  session: null,
  sync: IDLE_SYNC,
  syncNow: () => Promise.resolve(0),
  loadPhoto: (photo) => Promise.resolve(photo.data),
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
