import React from 'react'
import { TextInput as RNTextInput, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { toEnglishDigits, toPersianDigits } from '@shared/utils/persianText'

type Props = {
  label: string
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

/** Digits and one decimal point only; Persian digits and «٫» are accepted. */
function clean(text: string): string {
  return toEnglishDigits(text)
    .replace('٫', '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1')
}

/** A number in the filter's unit, or null when the box is empty. */
export function parseRangeValue(text: string): number | null {
  const value = Number.parseFloat(clean(text))
  return Number.isFinite(value) ? value : null
}

/** v1.3.0 (design batch 2): «قیمت (میلیارد تومان)  [۵] تا [۱۰]» in the filter sheet. */
export function RangeFilter({ label, from, to, onChange }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>{label}</Text>
      <View style={styles.row}>
        <RNTextInput
          // Amin #5199: no copy/cut/share menu on what is typed in the app
          contextMenuHidden
          value={toPersianDigits(from)}
          onChangeText={(text) => onChange(clean(text), to)}
          keyboardType="decimal-pad"
          placeholder="از"
          placeholderTextColor={theme.colors.placeholder}
          accessibilityLabel={`${label} از`}
          style={[theme.typography('bodyMd'), styles.box]}
        />
        <Text style={[theme.typography('bodySm'), styles.to]}>تا</Text>
        <RNTextInput
          // Amin #5199: no copy/cut/share menu on what is typed in the app
          contextMenuHidden
          value={toPersianDigits(to)}
          onChangeText={(text) => onChange(from, clean(text))}
          keyboardType="decimal-pad"
          placeholder="تا"
          placeholderTextColor={theme.colors.placeholder}
          accessibilityLabel={`${label} تا`}
          style={[theme.typography('bodyMd'), styles.box]}
        />
      </View>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: { gap: theme.spacing.space2 },
    label: { color: theme.colors.onSurface, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
    box: {
      flex: 1,
      height: 52,
      paddingHorizontal: theme.spacing.space4,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest,
      color: theme.colors.onSurface,
      textAlign: theme.isRTL ? 'right' : 'left' // rtl-allow: TextInput: Android does not swap, so right is physical right
    },
    to: { color: theme.colors.onSurfaceVariant }
  })
}
