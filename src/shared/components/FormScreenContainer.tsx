import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
}

/**
 * Shared safe-area + scrollable + keyboard-aware layout for create/edit
 * forms (§6 of the forms/matching brief — keyboard was hiding the bottom
 * fields and the submit button). `behavior` is iOS-only: Android's
 * `windowSoftInputMode="adjustResize"` (AndroidManifest.xml) already
 * resizes the window when the keyboard opens, so adding
 * KeyboardAvoidingView's own resize on top of that double-adjusts and
 * makes the content jump. The extra bottom padding keeps the submit
 * button reachable past the last field even when the keyboard is open;
 * RN's TextInput already auto-scrolls itself into view inside a
 * ScrollView on focus, so no extra scroll-tracking code is needed.
 */
export function FormScreenContainer({ children }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    flex: {
      flex: 1
    },
    content: {
      padding: theme.spacing.space6,
      paddingBottom: theme.spacing.space16,
      gap: theme.spacing.space4
    }
  })
}
