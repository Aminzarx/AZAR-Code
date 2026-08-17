import React, { useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from './Icon'

type Props = {
  accessibilityLabel: string
  onPress: () => void
  icon?: IconName
}

/**
 * Pinned bottom-corner add action for list screens — EmptyState's own
 * action button only exists while the list is empty, so once a screen has
 * even one row there was previously no way to add another without leaving
 * the screen. RTL mirroring places this at the screen's bottom-left
 * automatically (no hardcoded left/right style), matching every other
 * mirrored row in the app.
 */
export function FloatingActionButton({
  accessibilityLabel,
  onPress,
  icon = 'plus'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  // A fast double-tap can otherwise push the destination create screen
  // twice onto the stack before the first navigation finishes — this
  // ref-based cooldown (a plain, synchronous write, unlike React state)
  // drops any second tap that lands within the window.
  const lastPressAt = useRef(0)

  function handlePress(): void {
    const now = Date.now()
    if (now - lastPressAt.current < 800) {
      return
    }
    lastPressAt.current = now
    onPress()
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={styles.button}
    >
      <Icon name={icon} size="md" color={theme.colors.onPrimary} />
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      position: 'absolute',
      bottom: theme.spacing.space6,
      start: theme.spacing.space6,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.elevation.level2
    }
  })
}
