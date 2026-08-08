import React from 'react'
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { colors, radius, spacing, touchTargetMinimum, typography } from '@shared/tokens'

type Props = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  maxLength?: number
  errorMessage?: string
  autoFocus?: boolean
}

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  errorMessage,
  autoFocus
}: Props): React.JSX.Element {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, errorMessage && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoFocus={autoFocus}
        textAlign="right"
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.space2
  },
  label: {
    fontSize: typography.labelMd.fontSize,
    fontWeight: typography.labelMd.fontWeight,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  input: {
    minHeight: touchTargetMinimum,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.large,
    paddingHorizontal: spacing.space4,
    fontSize: typography.bodyLg.fontSize,
    color: colors.primary,
    writingDirection: 'rtl'
  },
  inputError: {
    borderColor: colors.error
  },
  error: {
    fontSize: typography.bodySm.fontSize,
    color: colors.error,
    textAlign: 'right',
    writingDirection: 'rtl'
  }
})
