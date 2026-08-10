import React, { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '@shared/theme'

/**
 * design-system.md §7.5 (v2.7.2) — replaces `@react-navigation/bottom-tabs`'
 * default tab button, which on Android shows a plain gray circular ripple
 * on every tap (unthemed, visually disconnected from the rest of the app's
 * press feedback) before fading out. Suppresses that ripple and reuses the
 * same subtle press-scale treatment `Button.tsx` already uses everywhere
 * else, so tab presses feel like the same product as every other button.
 */
export function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  testID
}: BottomTabBarButtonProps): React.JSX.Element {
  const theme = useTheme()
  const [isPressed, setIsPressed] = useState(false)

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      android_ripple={{ color: 'transparent' }}
      style={[
        style,
        styles.button,
        isPressed && { transform: [{ scale: theme.motion.pressScale }] }
      ]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center'
  }
})
