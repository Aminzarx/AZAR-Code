import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle
} from 'react-native'
import { useTheme } from '@shared/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text' | 'destructiveText'

type Props = {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * design-system.md §7.1 — one primary action per screen/sheet footer
 * maximum, destructive actions always paired with a cancel/secondary
 * action; that pairing is the screen's responsibility, not this
 * component's to enforce.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  style
}: Props): React.JSX.Element {
  const theme = useTheme()
  const [isPressed, setIsPressed] = useState(false)
  const isDisabled = disabled || loading

  const variantStyle = variantStyles(theme)[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          minHeight: theme.touchTargetMinimum,
          borderRadius: theme.component.button.radius,
          paddingVertical: theme.component.button.paddingY,
          paddingHorizontal: theme.component.button.paddingX
        },
        variantStyle.container,
        fullWidth && styles.fullWidth,
        isPressed && { transform: [{ scale: theme.motion.pressScale }] },
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            theme.typography('labelMd'),
            variantStyle.text,
            variant === 'text' && styles.textVariantLabel
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

function variantStyles(theme: ReturnType<typeof useTheme>) {
  return {
    primary: {
      container: { backgroundColor: theme.colors.primary },
      text: { color: theme.colors.onPrimary }
    },
    // v2.9.2 — a bare 1px `outline`-colored border on a transparent fill
    // read as too thin/disconnected against the rest of the app's flatter
    // surfaces, per explicit feedback that it wasn't "weighted" the same
    // as everything else. A subtle tonal fill (`surfaceContainerLow`)
    // plus a lighter `outlineVariant` hairline (matching every other
    // border in the app — cards, dividers) reads as a deliberate,
    // professional secondary button instead of a thin outline floating
    // on its own.
    secondary: {
      container: {
        backgroundColor: theme.colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant
      },
      text: { color: theme.colors.primary }
    },
    destructive: {
      container: { backgroundColor: theme.colors.error },
      text: { color: theme.colors.onError }
    },
    text: {
      container: { backgroundColor: 'transparent' },
      text: { color: theme.colors.primary }
    },
    // v2.9.1 — a muted destructive action (e.g. "mark as lost" sitting
    // next to a real primary CTA) that still reads as negative via its
    // red text, without competing visually the way a solid-red filled
    // button would.
    destructiveText: {
      container: { backgroundColor: 'transparent' },
      text: { color: theme.colors.error }
    }
  } as const
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.5
  },
  textVariantLabel: {
    textDecorationLine: 'underline'
  }
})
