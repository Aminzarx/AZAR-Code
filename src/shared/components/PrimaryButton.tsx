import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing, touchTargetMinimum, typography } from '@shared/tokens'

type Props = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}

export function PrimaryButton({ label, onPress, disabled, loading }: Props): React.JSX.Element {
  const isDisabled = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.large,
    minHeight: touchTargetMinimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space4
  },
  buttonDisabled: {
    opacity: 0.5
  },
  label: {
    color: colors.onPrimary,
    fontSize: typography.labelMd.fontSize,
    fontWeight: typography.labelMd.fontWeight
  }
})
