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
  /** Zero counts for the quick-add chip row — each renders as its Persian unit name (see ZERO_LABELS) or "+N صفر" if unnamed. Defaults to [3, 4, 5, 6]. */
  quickZeroCounts?: number[]
}

function formatWithSeparators(rawDigits: string): string {
  if (!rawDigits) {
    return ''
  }
  return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const ZERO_LABELS: Record<number, string> = {
  3: 'هزار',
  4: 'ده هزار',
  5: 'صد هزار',
  6: 'میلیون',
  9: 'میلیارد'
}

/**
 * A price/budget field — design-system.md §8.3's TextInput plus two UX
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
  quickZeroCounts = [3, 4, 5, 6]
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
        <View style={styles.chipRow}>
          {quickZeroCounts.map((count) => {
            const unitLabel = ZERO_LABELS[count]
            const chipText = unitLabel ? `+ ${unitLabel}` : `+${count} صفر`
            return (
              <Pressable
                key={count}
                accessibilityRole="button"
                accessibilityLabel={`افزودن ${count} صفر${unitLabel ? ` (${unitLabel})` : ''}`}
                onPress={() => handleAddZeros(count)}
                disabled={!value}
                style={[styles.chip, !value && styles.chipDisabled]}
              >
                <Text style={[theme.typography('labelSm'), styles.chipLabel]}>{chipText}</Text>
              </Pressable>
            )
          })}
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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    chip: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    chipDisabled: {
      opacity: 0.5
    },
    chipLabel: {
      color: theme.colors.primary
    }
  })
}
