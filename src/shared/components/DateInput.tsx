import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { formatJalaliDate, parseJalaliDate } from '@shared/utils/jalaliDate'
import { Button } from './Button'
import { Icon } from './Icon'
import { JalaliCalendarPicker } from './JalaliCalendarPicker'
import { TextInput } from './TextInput'

type Props = {
  label: string
  /**
   * A Jalali date string in essentially any shape the user typed it
   * (`1405/5/12`, `۱۴۰۵/۰۵/۱۲`, ...) — `parseJalaliDate` normalizes it,
   * this component does not enforce a canonical format on every
   * keystroke so the user can freely edit mid-string.
   */
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  helperText?: string
  errorMessage?: string
  required?: boolean
}

/**
 * A text field for manual Jalali date entry (any digit style, any
 * separator, single- or double-digit month/day — `parseJalaliDate`
 * handles all of that) paired with a calendar-icon button that opens a
 * `JalaliCalendarPicker` for users who'd rather tap through a grid.
 * Either path writes back the same canonical `YYYY/MM/DD` string, so
 * `onChangeText`'s caller never needs to know which one was used.
 */
export function DateInput({
  label,
  value,
  onChangeText,
  placeholder = '1405/05/12',
  helperText,
  errorMessage,
  required
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [isPickerVisible, setIsPickerVisible] = useState(false)

  function handleSelect(date: { year: number; month: number; day: number }): void {
    onChangeText(formatJalaliDate(date))
    setIsPickerVisible(false)
  }

  return (
    <View style={styles.group}>
      <View style={styles.fieldRow}>
        <View style={styles.textFieldWrapper}>
          <TextInput
            label={label}
            required={required}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            helperText={helperText}
            errorMessage={errorMessage}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`باز کردن تقویم برای ${label}`}
          onPress={() => setIsPickerVisible(true)}
          style={styles.calendarButton}
          hitSlop={theme.spacing.space2}
        >
          <Icon name="calendar" size="sm" color={theme.colors.primary} />
        </Pressable>
      </View>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsPickerVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="بستن"
        >
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <Text style={[theme.typography('titleMd'), styles.title]}>{label}</Text>
            <JalaliCalendarPicker value={parseJalaliDate(value)} onSelect={handleSelect} />
            <Button
              label="بستن"
              variant="secondary"
              onPress={() => setIsPickerVisible(false)}
              style={styles.closeButton}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      flex: 1
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.space2
    },
    textFieldWrapper: {
      flex: 1
    },
    calendarButton: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    card: {
      width: '100%',
      maxWidth: 480,
      borderRadius: theme.radius.extraLarge,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4,
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      ...theme.elevation.level4
    },
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    closeButton: {
      marginTop: theme.spacing.space1
    }
  })
}
