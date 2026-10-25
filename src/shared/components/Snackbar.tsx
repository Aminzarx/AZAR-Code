import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native'
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
  // Amin #5186: it slides up from the bottom edge as it appears
  const rise = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!visible) {
      rise.setValue(0)
      return
    }
    Animated.timing(rise, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [visible, rise])
  if (!visible) {
    return null
  }
  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom, opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={styles.bar} accessibilityLiveRegion="polite">
        <Text style={[theme.typography('bodyMd'), styles.message]} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8}>
            <Text style={[theme.typography('labelMd'), styles.action]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
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
