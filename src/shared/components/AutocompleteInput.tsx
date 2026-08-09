import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { findClosestMatch, normalizePersianText, suggestMatches } from '@shared/utils/persianText'
import { TextInput } from './TextInput'

type Props = {
  label: string
  value: string
  onChangeValue: (value: string) => void
  /** Known options to suggest from — typing anything else is always allowed, nothing here is enforced. */
  suggestions: readonly string[]
  placeholder?: string
  helperText?: string
  errorMessage?: string
  required?: boolean
  disabled?: boolean
}

/**
 * A free-text field with an optional suggestion dropdown and typo
 * correction hint — for propertyType/transactionType/city (§3/§7 of the
 * forms/matching brief). Selection is never forced: the user can type
 * anything and submit it as-is. A close-but-not-exact match (e.g.
 * "آبارتمان" vs "آپارتمان") surfaces as a tappable "did you mean" hint
 * rather than silently rewriting what the user typed.
 */
export function AutocompleteInput({
  label,
  value,
  onChangeValue,
  suggestions,
  placeholder,
  helperText,
  errorMessage,
  required,
  disabled
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [isFocused, setIsFocused] = useState(false)

  const trimmed = value.trim()
  const dropdownOptions =
    isFocused && trimmed
      ? suggestMatches(trimmed, suggestions, 5).filter(
          (option) => normalizePersianText(option) !== normalizePersianText(trimmed)
        )
      : []

  const hasExactMatch = suggestions.some(
    (option) => normalizePersianText(option) === normalizePersianText(trimmed)
  )
  const typoSuggestion =
    !isFocused && trimmed && !hasExactMatch ? findClosestMatch(trimmed, suggestions, 2) : null

  function selectSuggestion(option: string): void {
    onChangeValue(option)
    setIsFocused(false)
  }

  return (
    <View style={styles.group}>
      <TextInput
        label={label}
        required={required}
        value={value}
        onChangeText={onChangeValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        helperText={helperText}
        errorMessage={errorMessage}
        disabled={disabled}
      />
      {typoSuggestion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`اصلاح به ${typoSuggestion}`}
          onPress={() => selectSuggestion(typoSuggestion)}
          style={styles.typoHint}
        >
          <Text style={[theme.typography('bodySm'), styles.typoHintText]}>
            منظورتان «{typoSuggestion}» است؟
          </Text>
        </Pressable>
      ) : null}
      {dropdownOptions.length > 0 ? (
        <View style={styles.dropdown}>
          {dropdownOptions.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              onPress={() => selectSuggestion(option)}
              style={styles.dropdownItem}
            >
              <Text style={[theme.typography('bodyMd'), styles.dropdownItemText]}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing.space2
    },
    dropdown: {
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest,
      overflow: 'hidden'
    },
    dropdownItem: {
      minHeight: theme.touchTargetMinimum,
      justifyContent: 'center',
      paddingHorizontal: theme.component.textField.paddingX,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant
    },
    dropdownItemText: {
      color: theme.colors.onSurface
    },
    typoHint: {
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    typoHintText: {
      color: theme.colors.primary
    }
  })
}
