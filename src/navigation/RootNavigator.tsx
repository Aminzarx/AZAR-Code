import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme } from '@shared/theme'
import { SplashScreen, useSplash } from '../app/SplashScreen'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'

const FILES_WAIT_MS = 12000

/**
 * Session-gated root: AuthNavigator (Welcome -> ... -> ReferralCode)
 * while unauthenticated, MainNavigator (bottom-tab layout, Home tab
 * first) once a session exists. Switches automatically the moment
 * AuthProvider's session state changes — register()/login()/logout()
 * all update it.
 */
export function RootNavigator(): React.JSX.Element {
  const { isInitializing, session, sync } = useAuth()
  const theme = useTheme()
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
  const splash = useSplash(!isInitializing && navReady && filesReady)

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {isInitializing ? null : (
        <NavigationContainer onReady={() => setNavReady(true)}>
          {session ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      )}
      {splash.visible ? <SplashScreen done={splash.done} onHidden={splash.hide} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
