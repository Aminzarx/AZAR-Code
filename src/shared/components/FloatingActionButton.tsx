import React, { useRef } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from './Icon'
import { useLicence } from '../licence/LicenceContext'

type Props = {
  accessibilityLabel: string
  onPress: () => void
  icon?: IconName
  /** v1.3.0: a short label turns it into the wide «+ فایل تازه» pill of the mockups. */
  label?: string
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
  icon = 'plus',
  label
}: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { canEdit } = useLicence()
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

  // Amin #4906: nothing new is added while the licence has ended
  if (!canEdit) {
    return null
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={[styles.button, label ? styles.extended : null]}
    >
      <Icon name={icon} size="md" color={theme.colors.onPrimary} />
      {label ? <Text style={[theme.typography('titleSm'), styles.label]}>{label}</Text> : null}
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      position: 'absolute',
      bottom: theme.spacing.space6,
      // v1.3.0: bottom-left in RTL, as in the approved mockups.
      end: theme.spacing.space6,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.elevation.level2
    },
    extended: {
      // 'auto', not undefined: the web build ignores an undefined override and kept the round button's 56 px
      width: 'auto',
      flexDirection: 'row',
      gap: theme.spacing.space2,
      paddingHorizontal: theme.spacing.space5,
      borderRadius: theme.radius.extraLarge
    },
    label: {
      color: theme.colors.onPrimary
    }
  })
}
