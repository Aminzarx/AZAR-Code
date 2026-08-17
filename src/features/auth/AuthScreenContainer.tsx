import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
  justify?: 'upper-third' | 'space-between'
}

/**
 * Shared safe-area + padded flex layout used by every Auth screen.
 * `upper-third` (the default) anchors content around the top third of the
 * screen using two flex-ratio spacers rather than `justifyContent: 'center'`
 * — a single form (phone entry, OTP, referral code) centered on a tall
 * screen used to sit right where a keyboard opening then covers it;
 * anchoring higher keeps it comfortably visible above the keyboard on every
 * screen size, and — because AndroidManifest's `windowSoftInputMode`
 * already shrinks the window itself when the keyboard opens (same reasoning
 * as FormScreenContainer) — the same 1:2 spacer ratio keeps working
 * proportionally once the window shrinks, with no separate
 * KeyboardAvoidingView needed. `space-between` stays available for screens
 * like Welcome that deliberately pin content to both the top and bottom of
 * the screen.
 */
export function AuthScreenContainer({
  children,
  justify = 'upper-third'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (justify === 'space-between') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.spaceBetween]}>{children}</View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />
        {children}
        <View style={styles.bottomSpacer} />
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
    container: {
      flex: 1,
      padding: theme.spacing.space6
    },
    spaceBetween: {
      justifyContent: 'space-between'
    },
    topSpacer: {
      flex: 1
    },
    bottomSpacer: {
      flex: 2
    }
  })
}
