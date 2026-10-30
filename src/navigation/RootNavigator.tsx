import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme } from '@shared/theme'
import { SplashScreen, useSplash } from '../app/SplashScreen'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { OfficePortalScreen } from '@features/settings/screens/OfficePortalScreen'
import { useOfficePortal, useOfficeSignIn, useOfficeSignInWatch } from '@features/settings/services/officePanel'
import { OfficeSignInPrompt } from '@features/settings/components/OfficeSignInPrompt'

const FILES_WAIT_MS = 12000

/**
 * Session-gated root: AuthNavigator (Welcome -> ... -> ReferralCode)
 * while unauthenticated, MainNavigator (bottom-tab layout, Home tab
 * first) once a session exists. Switches automatically the moment
 * AuthProvider's session state changes — register()/login()/logout()
 * all update it.
 */
export function RootNavigator(): React.JSX.Element {
  const { isInitializing, session, sync, reloadFiles } = useAuth()
  const theme = useTheme()
  // Amin #5055: the navigators' own backgrounds (screens, tab bar edge, headers) follow the light/dark palette
  const navTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surfaceContainerLowest,
        text: theme.colors.onSurface,
        border: theme.colors.outlineVariant
      }
    }
  }, [theme])
  // Amin #4936: the splash stays at least 3 s and until the app is really there — the first screen drawn and,
  // signed in, the account's files loaded from the server (#4826) or the phone found offline — then fades over it.
  // A very slow network does not hold it longer than FILES_WAIT_MS.
  const [navReady, setNavReady] = useState(false)
  const [waitedEnough, setWaitedEnough] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setWaitedEnough(true), FILES_WAIT_MS)
    return () => clearTimeout(timer)
  }, [])
  const filesReady = !session || sync.settled || waitedEnough
  // Amin #5970: an account whose office panel is on sees only the panel screen (its files stay on the phone)
  const portal = useOfficePortal(session?.sessionToken)
  const portalScreen = !!session && portal === true
  // Amin #6343: the panel went off (taken back from the dashboard, or turned off) → the office's files that came home
  // are on the server: load them again so the app shows them without a restart
  const wasPortal = useRef(portal)
  useEffect(() => {
    if (wasPortal.current === true && portal === false && session) reloadFiles?.().catch(() => undefined)
    wasPortal.current = portal
  }, [portal, session, reloadFiles])
  // Amin #6346: a dashboard sign-in for this phone opens at once over whatever is on screen (portal screen or the app)
  const watching = useOfficeSignInWatch()
  const signIn = useOfficeSignIn(session?.sessionToken, !!session && watching)
  const splash = useSplash(!isInitializing && (navReady || portalScreen) && filesReady && (!session || portal !== null))

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {isInitializing ? null : portalScreen ? (
        <OfficePortalScreen />
      ) : (
        <NavigationContainer theme={navTheme} onReady={() => setNavReady(true)}>
          {session ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      )}
      {session && signIn.link && !splash.visible ? (
        <OfficeSignInPrompt key={signIn.link.code} sessionToken={session.sessionToken} link={signIn.link} onDone={signIn.done} />
      ) : null}
      {splash.visible ? <SplashScreen done={splash.done} onHidden={splash.hide} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
