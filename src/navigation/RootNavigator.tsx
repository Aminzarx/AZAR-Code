import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { colors } from '@shared/tokens'

/**
 * Session-gated root: AuthNavigator (Welcome -> ... -> ReferralCode)
 * while unauthenticated, MainNavigator (BasicProfile -> Home) once a
 * session exists. Switches automatically the moment AuthProvider's
 * session state changes — register()/login()/logout() all update it.
 */
export function RootNavigator(): React.JSX.Element {
  const { isInitializing, session } = useAuth()

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
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
    justifyContent: 'center',
    backgroundColor: colors.background
  }
})
