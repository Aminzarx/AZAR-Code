import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
  justify?: 'flex-start' | 'space-between'
}

/** Shared safe-area + padded flex layout used by every Auth screen. */
export function AuthScreenContainer({
  children,
  justify = 'flex-start'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={justify === 'space-between' ? styles.containerBetween : styles.containerStart}>
        {children}
      </View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    containerStart: {
      flex: 1,
      padding: theme.spacing.space6,
      justifyContent: 'flex-start'
    },
    containerBetween: {
      flex: 1,
      padding: theme.spacing.space6,
      justifyContent: 'space-between'
    }
  })
}
