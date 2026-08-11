import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
  justify?: 'center' | 'flex-start' | 'space-between'
}

/**
 * Shared safe-area + padded flex layout used by every Auth screen.
 * Defaults to vertically centered content — a single form (phone entry,
 * OTP, referral code) reads as pinned/floating at the top of an
 * otherwise-empty screen otherwise. `space-between` stays available for
 * screens like Welcome that deliberately pin content to both the top and
 * bottom of the screen.
 */
export function AuthScreenContainer({ children, justify = 'center' }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { justifyContent: justify }]}>{children}</View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    container: {
      flex: 1,
      padding: theme.spacing.space6
    }
  })
}
