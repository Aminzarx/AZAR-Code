import React from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme } from '@shared/theme'
import { LoadingIndicator } from '@shared/components'
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

  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>{session ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
