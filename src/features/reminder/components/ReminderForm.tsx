import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import {
  ChipGroup,
  DateInput,
  FormRow,
  SegmentedControl,
  TextInput,
  type SegmentedControlOption
} from '@shared/components'
import { toFormDateTime } from '../validation/reminderValidation'
import type { ReminderFormErrors, ReminderFormValues, ReminderType } from '../types'

const REMINDER_TYPE_OPTIONS: readonly SegmentedControlOption<ReminderType>[] = [
  { value: 'general', label: 'عمومی' },
  { value: 'call', label: 'تماس' },
  { value: 'visit', label: 'بازدید' }
]

type Props = {
  values: ReminderFormValues
  errors: ReminderFormErrors
  onChange: <K extends keyof ReminderFormValues>(field: K, value: ReminderFormValues[K]) => void
}

/**
 * The quick-date chips (امروز/فردا/پس‌فردا) built from `ChipGroup` cover
 * the common case; `DateInput` (manual Jalali entry + calendar picker)
 * covers everything else — the time field stays a plain `TextInput`
 * (`HH:mm`), no time-picker widget was requested.
 */
function useQuickDateOptions(): { value: string; label: string }[] {
  return useMemo(() => {
    const now = new Date()
    const labels = ['امروز', 'فردا', 'پس‌فردا']
    return labels.map((label, offsetDays) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
      return { value: toFormDateTime(day.toISOString()).date, label }
    })
  }, [])
}

/**
 * Shared by CreateReminderScreen and ReminderDetailScreen's edit mode.
 * Submitting happens via FormScreenContainer's persistent header save
 * action (screen-level, not rendered here) — no duplicate bottom submit
 * button.
 */
export function ReminderForm({ values, errors, onChange }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const quickDateOptions = useQuickDateOptions()
  const selectedQuickDate = quickDateOptions.find((option) => option.value === values.date)

  return (
    <View style={styles.form}>
      <TextInput
        label="عنوان"
        required
        value={values.title}
        onChangeText={(value) => onChange('title', value)}
        placeholder="مثلاً تماس با متقاضی"
        errorMessage={errors.title}
      />
      <View style={styles.typeGroup}>
        <Text style={[theme.typography('labelMd'), styles.typeLabel]}>نوع یادآوری</Text>
        <SegmentedControl
          options={REMINDER_TYPE_OPTIONS}
          value={values.reminderType}
          onChange={(value) => onChange('reminderType', value)}
        />
      </View>
      <ChipGroup
        label="انتخاب سریع تاریخ"
        options={quickDateOptions}
        value={selectedQuickDate?.value ?? null}
        onChange={(value) => onChange('date', value ?? '')}
      />
      <FormRow>
        <DateInput
          label="تاریخ"
          required
          value={values.date}
          onChangeText={(value) => onChange('date', value)}
          errorMessage={errors.date}
        />
        <TextInput
          label="زمان"
          required
          value={values.time}
          onChangeText={(value) => onChange('time', value)}
          placeholder="14:30"
          helperText="ساعت:دقیقه"
          errorMessage={errors.time}
        />
      </FormRow>
      <TextInput
        label="توضیحات"
        value={values.description}
        onChangeText={(value) => onChange('description', value)}
        placeholder="توضیحات تکمیلی (اختیاری)"
        errorMessage={errors.description}
      />
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: {
      gap: theme.spacing.space5
    },
    typeGroup: {
      gap: theme.spacing.space2
    },
    typeLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
