import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { toPersianDigits } from '@shared/utils/persianText'

type Props = {
  label: string
  /** Plain digits or '' (not set). */
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  errorMessage?: string
}

/** v3.0.0 (Amin #4180): a small count (rooms) set with − / + instead of the keyboard. */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
  errorMessage
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const n = value === '' ? null : Number(value)

  function step(delta: number): void {
    if (n === null) {
      // first tap on an empty count: + means one room, not zero
      onChange(String(delta > 0 ? Math.max(min, 1) : min))
      return
    }
    onChange(String(Math.min(max, Math.max(min, n + delta))))
  }

  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>{label}</Text>
      <View style={styles.box}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`یکی بیشتر ${label}`}
          onPress={() => step(1)}
          style={styles.btn}
        >
          <Text style={[theme.typography('titleMd'), styles.btnText]}>+</Text>
        </Pressable>
        {/* v1.3.0: an empty count showed «—», which read as a minus button. */}
        <Text
          style={[theme.typography('titleMd'), styles.value, n === null && styles.valueEmpty]}
          accessibilityLabel={label}
        >
          {n === null ? '؟' : toPersianDigits(String(n))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`یکی کمتر ${label}`}
          onPress={() => step(-1)}
          disabled={n === null || n <= min}
          style={[styles.btn, (n === null || n <= min) && styles.btnDisabled]}
        >
          <Text style={[theme.typography('titleMd'), styles.btnText]}>−</Text>
        </Pressable>
      </View>
      {errorMessage ? (
        <Text style={[theme.typography('bodySm'), styles.error]}>{errorMessage}</Text>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    group: { gap: theme.spacing.space2, flex: 1 },
    label: { color: theme.colors.onSurface, alignSelf: start },
    box: {
      minHeight: theme.touchTargetMinimum + 4,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.component.textField.radius,
      backgroundColor: theme.colors.field,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.space2
    },
    btn: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: theme.colors.primary },
    value: { color: theme.colors.onSurface },
    valueEmpty: { color: theme.colors.placeholder },
    error: { color: theme.colors.error, alignSelf: start }
  })
}
