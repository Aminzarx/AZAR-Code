import React from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootNavigator } from '@navigation/RootNavigator'

/**
 * One shared QueryClient instance for the app's data-fetching/caching layer
 * (see docs/implementation/phase-5-decisions.md — "State/data layer").
 * From Phase 6 onward, queries wrap the repository layer; no repository
 * exists yet, so nothing in this app actually fetches data in Phase 5.
 */
const queryClient = new QueryClient()

export function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
