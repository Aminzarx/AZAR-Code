import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme } from '@shared/theme'
import { SplashScreen, useSplash } from '../app/SplashScreen'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'

/**
 * Session-gated root: AuthNavigator (Welcome -> ... -> ReferralCode)
 * while unauthenticated, MainNavigator (bottom-tab layout, Home tab
 * first) once a session exists. Switches automatically the moment
 * AuthProvider's session state changes — register()/login()/logout()
 * all update it.
 */
export function RootNavigator(): React.JSX.Element {
  const { isInitializing, session } = useAuth()
  const theme = useTheme()
  // Amin #4936: the splash stays at least 3 s and until the first screen is really there, then fades over it
  const [navReady, setNavReady] = useState(false)
  const splash = useSplash(!isInitializing && navReady)

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
