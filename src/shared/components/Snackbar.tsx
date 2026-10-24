import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  visible: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  /** extra space above the tab bar / bottom edge */
  bottom?: number
}

/**
 * v1.4.0: a short message at the bottom of the screen with one action,
 * used for «حذف شد · برگردان». It floats over the list (absolute), so the
 * screen that shows it renders it last, inside its own root view.
 */
export function Snackbar({ visible, message, actionLabel, onAction, bottom = 16 }: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  if (!visible) {
    return null
  }
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <Text style={[theme.typography('bodyMd'), styles.message]} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8}>
            <Text style={[theme.typography('labelMd'), styles.action]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: theme.layout.screenPaddingX,
      right: theme.layout.screenPaddingX
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.inverseSurface,
      ...theme.elevation.level2
    },
    message: {
      flex: 1,
      color: theme.colors.inverseOnSurface
    },
    action: {
      color: theme.colors.inversePrimary,
      fontWeight: '700'
    }
  })
}
