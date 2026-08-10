import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { FormRow, TextInput } from '@shared/components'
import type { ReminderFormErrors, ReminderFormValues } from '../types'

type Props = {
  values: ReminderFormValues
  errors: ReminderFormErrors
  onChange: <K extends keyof ReminderFormValues>(field: K, value: ReminderFormValues[K]) => void
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
      <FormRow>
        <TextInput
          label="تاریخ"
          required
          value={values.date}
          onChangeText={(value) => onChange('date', value)}
          placeholder="1404-05-20"
          errorMessage={errors.date}
        />
        <TextInput
          label="زمان"
          required
          value={values.time}
          onChangeText={(value) => onChange('time', value)}
          placeholder="14:30"
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
