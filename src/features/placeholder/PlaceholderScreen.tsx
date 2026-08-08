import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Phase 5 foundation screen only — proves the app builds, navigates, and
 * renders on both platforms. Replaced by real feature screens in Phase 12
 * (see docs/implementation/ui-screen-mapping.md).
 */
export function PlaceholderScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>AZAR CRM</Text>
        <Text style={styles.subtitle}>React Native foundation — Phase 5</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '600'
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.6
  }
})
