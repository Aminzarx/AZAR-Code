import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type KeyboardTypeOptions
} from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  helperText?: string
  errorMessage?: string
  keyboardType?: KeyboardTypeOptions
  maxLength?: number
  autoFocus?: boolean
  disabled?: boolean
  secureTextEntry?: boolean
  /** Shows a red asterisk beside the label — design-system's required-field indicator, not a validation rule by itself. */
  required?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

/** design-system.md §7.2 — label above field, focus/error/disabled states. */
export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  errorMessage,
  keyboardType,
  maxLength,
  autoFocus,
  disabled,
  secureTextEntry,
  required,
  onFocus,
  onBlur
}: Props): React.JSX.Element {
  const theme = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const hasError = Boolean(errorMessage)
  const styles = createStyles(theme)

  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <RNTextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[
          theme.typography('bodyMd'),
          styles.input,
          hasError ? styles.inputError : isFocused ? styles.inputFocused : styles.inputDefault,
          disabled && styles.inputDisabled
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setIsFocused(true)
          onFocus?.()
        }}
        onBlur={() => {
          setIsFocused(false)
          onBlur?.()
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.outline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoFocus={autoFocus}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
        textAlign={theme.isRTL ? 'right' : 'left'}
      />
      {hasError ? (
        <Text style={[theme.typography('bodySm'), styles.errorText]}>{errorMessage}</Text>
      ) : helperText ? (
        <Text style={[theme.typography('bodySm'), styles.helperText]}>{helperText}</Text>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing.space2
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    label: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    requiredMark: {
      color: theme.colors.error
    },
    input: {
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.component.textField.radius,
      paddingVertical: theme.component.textField.paddingY,
      paddingHorizontal: theme.component.textField.paddingX,
      color: theme.colors.primary
    },
    inputDefault: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    inputFocused: {
      borderWidth: 1,
      borderColor: theme.colors.primary
    },
    inputError: {
      borderWidth: 2,
      borderColor: theme.colors.error
    },
    inputDisabled: {
      color: theme.colors.outline,
      backgroundColor: theme.colors.surfaceContainerLow
    },
    errorText: {
      color: theme.colors.error
    },
    helperText: {
      color: theme.colors.onSurfaceVariant
    }
  })
}
