import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { TextInput } from './TextInput'

type Props = {
  label: string
  /** Plain numeric string, no separators — the value stored/sent to validation stays numeric-only. */
  value: string
  onChangeValue: (value: string) => void
  placeholder?: string
  helperText?: string
  errorMessage?: string
  required?: boolean
  disabled?: boolean
  /**
   * Zero counts for the quick-scale chip row — real-estate prices in
   * this app are effectively always stated in میلیون/میلیارد, so the
   * default is exactly those two magnitudes (design-system.md §7.2.1).
   */
  quickZeroCounts?: number[]
}

function formatWithSeparators(rawDigits: string): string {
  if (!rawDigits) {
    return ''
  }
  return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Screen-reader label only — the visible chip shows the comma-grouped zero string itself, not a word. */
const UNIT_NAMES: Record<number, string> = {
  6: 'میلیون',
  9: 'میلیارد'
}

/**
 * A price/budget field — design-system.md §7.2's TextInput plus two UX
 * additions financial fields specifically need: automatic thousand
 * separators for display (the underlying value stays plain digits, so
 * validation/DB usage in propertyValidation.ts etc. is unaffected) and
 * quick "+N zeros" chips so entering "500000000" doesn't mean typing nine
 * digits by hand.
 */
export function MoneyInput({
  label,
  value,
  onChangeValue,
  placeholder,
  helperText,
  errorMessage,
  required,
  disabled,
  quickZeroCounts = [6, 9]
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  function handleChangeText(text: string): void {
    const rawDigits = text.replace(/\D/g, '')
    onChangeValue(rawDigits)
  }

  function handleAddZeros(count: number): void {
    if (!value) {
      return
    }
    onChangeValue(value + '0'.repeat(count))
  }

  return (
    <View style={styles.group}>
      <TextInput
        label={label}
        required={required}
        value={formatWithSeparators(value)}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        helperText={helperText}
        errorMessage={errorMessage}
        keyboardType="number-pad"
        disabled={disabled}
      />
      {!disabled && quickZeroCounts.length > 0 ? (
        <View style={styles.chipGroup}>
          <Text style={[theme.typography('labelSm'), styles.chipCaption]}>
            برای تکمیل سریع رقم، واحد را انتخاب کنید
          </Text>
          <View style={styles.chipRow}>
            {quickZeroCounts.map((count) => {
              // The chip's own label IS the zero group it appends
              // ("000,000" for میلیون) — a digit string shows unambiguously
              // what happens to the number when tapped, unlike a word name
              // ("میلیون") or a "+"/"×" prefix, which both still require
              // the reader to know what the operation actually does.
              const chipText = formatWithSeparators('0'.repeat(count))
              const unitName = UNIT_NAMES[count]
              return (
                <Pressable
                  key={count}
                  accessibilityRole="button"
                  accessibilityLabel={
                    unitName
                      ? `ضرب عدد وارد شده در یک ${unitName}`
                      : `افزودن ${count} صفر به عدد وارد شده`
                  }
                  onPress={() => handleAddZeros(count)}
                  disabled={!value}
                  style={[styles.chip, !value && styles.chipDisabled]}
                >
                  <Text style={[theme.typography('labelSm'), styles.chipLabel]}>{chipText}</Text>
                </Pressable>
              )
            })}
          </View>
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
    chipGroup: {
      gap: theme.spacing.space1
    },
    chipCaption: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    chip: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      backgroundColor: theme.colors.secondaryContainer,
      borderWidth: 1,
      borderColor: theme.colors.secondaryContainer
    },
    chipDisabled: {
      opacity: 0.5
    },
    chipLabel: {
      color: theme.colors.onSecondaryContainer
    }
  })
}
