import React, { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { TextInput } from './TextInput'
import { amountInWords } from '@shared/utils/amountInWords'
import { toEnglishDigits, toPersianDigits } from '@shared/utils/persianText'

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
  // v1.4.0 (Amin): shown in Persian digits with the Persian thousands mark
  return toPersianDigits(rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '٬'))
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

  // Amin #5349: the separators are put back after every key, so the whole text is replaced and Android used to drop
  // the caret at the start. The caret is found from what changed, kept by counting the digits before it, and set back.
  const shown = formatWithSeparators(value)
  const pending = useRef<number | null>(null)
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined)

  function handleChangeText(text: string): void {
    // the edit sits between the part both texts start with and the part both end with; the caret is after it
    let suffix = 0
    const room = Math.min(text.length, shown.length)
    let prefix = 0
    while (prefix < room && text[prefix] === shown[prefix]) prefix++
    while (suffix < room - prefix && text[text.length - 1 - suffix] === shown[shown.length - 1 - suffix]) suffix++
    const caretInTyped = text.length - suffix
    const typed = toEnglishDigits(text)
    let rawDigits = typed.replace(/\D/g, '')
    let digitsBefore = typed.slice(0, caretInTyped).replace(/\D/g, '').length
    if (rawDigits === value && text.length < shown.length && digitsBefore > 0) {
      // only a separator was deleted: delete the digit before it instead
      rawDigits = value.slice(0, digitsBefore - 1) + value.slice(digitsBefore)
      digitsBefore -= 1
    }
    const next = formatWithSeparators(rawDigits)
    let at = 0
    for (let seen = 0; at < next.length && seen < digitsBefore; at++) {
      if (next[at] !== '٬') seen++
    }
    pending.current = at
    setSelection({ start: at, end: at })
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
        value={shown}
        onChangeText={handleChangeText}
        selection={selection}
        onSelectionChange={(event) => {
          const end = event.nativeEvent.selection.end
          const wanted = pending.current
          pending.current = null
          // the caret Android puts mid-edit is skipped once; after that the user's own taps move it freely
          if (wanted !== null && end !== wanted) return
          setSelection(undefined)
        }}
        placeholder={placeholder}
        // v3.0.0 (Amin #4180): the amount in words under the field
        helperText={helperText ?? (amountInWords(value) || undefined)}
        errorMessage={errorMessage}
        keyboardType="number-pad"
        disabled={disabled}
      />
      {!disabled && quickZeroCounts.length > 0 ? (
        <View style={styles.chipGroup}>
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
                  {/* v3.0.0: the chip says «× میلیون» rather than «000,000» */}
                  <Text style={[theme.typography('labelSm'), styles.chipLabel]}>
                    {unitName ? `× ${unitName}` : chipText}
                  </Text>
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
