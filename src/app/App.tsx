import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@shared/theme'
import { AuthProvider } from '@features/auth/AuthProvider'
import { RootNavigator } from '@navigation/RootNavigator'
import { runStartupTasks } from './startup'
import { UpdateChecker } from './UpdateChecker'

/**
 * One shared QueryClient instance for the app's data-fetching/caching layer
 * (see docs/implementation/phase-5-decisions.md — "State/data layer").
 */
const queryClient = new QueryClient()

export function App(): React.JSX.Element {
  useEffect(() => {
    runStartupTasks()
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
            <UpdateChecker />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
