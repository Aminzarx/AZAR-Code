import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { ReferralRelationshipRepository } from '@infrastructure/database/repositories/ReferralRelationshipRepository'
import { SessionRepository } from '@infrastructure/database/repositories/SessionRepository'
import { MockAuthApiClient } from '@infrastructure/auth/mockAuthApiClient'
import { generateId, generateReferralCode } from '@infrastructure/auth/idGenerators'
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
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isInitializing, setIsInitializing] = useState(true)
  const [session, setSession] = useState<CurrentSession | null>(null)
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null)
  const [authApiClient, setAuthApiClient] = useState<MockAuthApiClient | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const db = await getDatabase()
      const client = new MockAuthApiClient(
        new UserRepository(db),
        new ReferralRelationshipRepository(db),
        generateId,
        generateReferralCode
      )
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
    return {
      isInitializing,
      session,
      sendOtp: (phoneNumber) => authApiClient.sendOtp(phoneNumber),
      verifyOtp: (phoneNumber, code) => authApiClient.verifyOtp(phoneNumber, code),
      register: async (phoneNumber, referralCode) => {
        const result = await sessionManager.register(phoneNumber, referralCode)
        setSession(result)
        return result
      },
      login: async (phoneNumber) => {
        const result = await sessionManager.login(phoneNumber)
        setSession(result)
        return result
      },
      logout: async () => {
        await sessionManager.logout()
        setSession(null)
      }
    }
  }, [authApiClient, sessionManager, session, isInitializing])

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
  logout: () => Promise.reject(new Error('Auth is still initializing.'))
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
