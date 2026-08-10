import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider } from '@shared/theme'

/**
 * Mirrors App.tsx's real root wrapper — components using
 * react-native-gesture-handler primitives (e.g. FormScreenContainer's
 * ScrollView/Pressable, see its doc comment) throw
 * "GestureDetector must be used as a descendant of GestureHandlerRootView"
 * without this in tests, even though the real app always has one.
 */
export function withTheme(children: React.ReactNode, isRTL = true): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider isRTL={isRTL}>{children}</ThemeProvider>
    </GestureHandlerRootView>
  )
}
