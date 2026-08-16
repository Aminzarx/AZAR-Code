import React from 'react'
import { StyleSheet } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'

type Props = {
  onPress: () => void
}

/**
 * Explicit back control for screens that don't use `FormScreenContainer`
 * (§16 nav audit — MainNavigator sets headerShown:false everywhere, so
 * without this a screen has no in-UI way to leave besides the OS
 * swipe/hardware back gesture). Mirrors the back button built into
 * `FormScreenContainer`'s header so both surfaces stay visually and
 * behaviorally identical.
 */
export function BackButton({ onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="بازگشت"
      onPress={onPress}
      style={styles.backButton}
    >
      <Icon name="back" size="md" color={theme.colors.onSurface} />
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backButton: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
