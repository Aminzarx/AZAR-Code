import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { SessionRepository } from '@infrastructure/database/repositories/SessionRepository'
import { HttpAuthApiClient } from '@infrastructure/auth/httpAuthApiClient'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import { generateId } from '@infrastructure/auth/idGenerators'
import { keychainSecureStorage } from '@infrastructure/security/keychainSecureStorage'
import { SessionManager, type CurrentSession } from '@core/auth/sessionManager'

type AuthContextValue = {
  isInitializing: boolean
  session: CurrentSession | null
  sendOtp: (phoneNumber: string) => Promise<void>
  verifyOtp: (phoneNumber: string, code: string) => Promise<void>
  register: (phoneNumber: string, referralCode: string) => Promise<CurrentSession>
  login: (phoneNumber: string) => Promise<CurrentSession>
  logout: () => Promise<void>
  deleteAccount: (phoneNumber: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isInitializing, setIsInitializing] = useState(true)
  const [session, setSession] = useState<CurrentSession | null>(null)
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null)
  const [authApiClient, setAuthApiClient] = useState<HttpAuthApiClient | null>(null)
  const [userRepository, setUserRepository] = useState<UserRepository | null>(null)

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
      setSession(currentSession)
      setIsInitializing(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue | null>(() => {
    if (!sessionManager || !authApiClient) {
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

    return {
      isInitializing,
      session,
      sendOtp: (phoneNumber) => authApiClient.sendOtp(phoneNumber),
      verifyOtp: (phoneNumber, code) => authApiClient.verifyOtp(phoneNumber, code),
      register: async (phoneNumber, referralCode) => {
        const result = await sessionManager.register(phoneNumber, referralCode)
        await cacheUserLocally(phoneNumber, result)
        setSession(result)
        return result
      },
      login: async (phoneNumber) => {
        const result = await sessionManager.login(phoneNumber)
        await cacheUserLocally(phoneNumber, result)
        setSession(result)
        return result
      },
      logout: async () => {
        await sessionManager.logout()
        setSession(null)
      },
      deleteAccount: async (phoneNumber) => {
        await authApiClient.deleteAccount(phoneNumber)
        await sessionManager.logout()
        setSession(null)
      }
    }
  }, [authApiClient, sessionManager, session, isInitializing, userRepository])

  return (
    <AuthContext.Provider value={value ?? { ...placeholderValue, isInitializing: true }}>
      {children}
    </AuthContext.Provider>
  )
}

const placeholderValue: AuthContextValue = {
  isInitializing: true,
  session: null,
  sendOtp: () => Promise.reject(new Error('Auth is still initializing.')),
  verifyOtp: () => Promise.reject(new Error('Auth is still initializing.')),
  register: () => Promise.reject(new Error('Auth is still initializing.')),
  login: () => Promise.reject(new Error('Auth is still initializing.')),
  logout: () => Promise.reject(new Error('Auth is still initializing.')),
  deleteAccount: () => Promise.reject(new Error('Auth is still initializing.'))
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
