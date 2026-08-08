import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import type { ContractFormErrors, ContractFormValues } from '../types'

type Props = {
  values: ContractFormValues
  errors: ContractFormErrors
  onChange: <K extends keyof ContractFormValues>(field: K, value: ContractFormValues[K]) => void
  onSubmit: () => void
  submitLabel: string
  isSubmitting: boolean
}

/** Shared by CreateContractScreen and ContractDetailScreen's edit mode. */
export function ContractForm({
  values,
  errors,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.form}>
      <TextInput
        label="نوع قرارداد"
        value={values.type}
        onChangeText={(value) => onChange('type', value)}
        placeholder="فروش، اجاره..."
        errorMessage={errors.type}
      />
      <TextInput
        label="مبلغ (تومان)"
        value={values.amount}
        onChangeText={(value) => onChange('amount', value)}
        keyboardType="number-pad"
        errorMessage={errors.amount}
      />
      <TextInput
        label="تاریخ شروع"
        value={values.startDate}
        onChangeText={(value) => onChange('startDate', value)}
        placeholder="1404-05-20"
        errorMessage={errors.startDate}
      />
      <TextInput
        label="تاریخ پایان"
        value={values.endDate}
        onChangeText={(value) => onChange('endDate', value)}
        placeholder="1405-05-20"
        errorMessage={errors.endDate}
      />
      <TextInput
        label="یادداشت"
        value={values.notes}
        onChangeText={(value) => onChange('notes', value)}
        placeholder="توضیحات تکمیلی (اختیاری)"
        errorMessage={errors.notes}
      />
      <Button label={submitLabel} onPress={onSubmit} loading={isSubmitting} style={styles.submit} />
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: {
      gap: theme.spacing.space5
    },
    submit: {
      marginTop: theme.spacing.space3
    }
  })
}
