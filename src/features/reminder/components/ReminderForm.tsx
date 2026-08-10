import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { ChipGroup, FormRow, TextInput } from '@shared/components'
import { toFormDateTime } from '../validation/reminderValidation'
import type { ReminderFormErrors, ReminderFormValues } from '../types'

type Props = {
  values: ReminderFormValues
  errors: ReminderFormErrors
  onChange: <K extends keyof ReminderFormValues>(field: K, value: ReminderFormValues[K]) => void
}

/**
 * §17.3/§15 — the date/time fields stay plain `TextInput`s: no Jalali
 * calendar or time-wheel library is a dependency of this app
 * (`package.json` has none), and adding one is out of scope for a UI-only
 * redesign. The quick-date chips below are the scoped-down replacement —
 * built from `ChipGroup`, an existing shared primitive, no new dependency —
 * covering the common case (امروز/فردا/پس‌فردا) while manual entry still
 * covers everything else.
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
      <ChipGroup
        label="انتخاب سریع تاریخ"
        options={quickDateOptions}
        value={selectedQuickDate?.value ?? null}
        onChange={(value) => onChange('date', value ?? '')}
      />
      <FormRow>
        <TextInput
          label="تاریخ"
          required
          value={values.date}
          onChangeText={(value) => onChange('date', value)}
          placeholder="2026-08-20"
          helperText="سال-ماه-روز میلادی"
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
    }
  })
}
