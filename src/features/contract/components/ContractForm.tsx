import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { AutocompleteInput, DateInput, FormRow, MoneyInput, TextInput } from '@shared/components'
import { PROPERTY_TRANSACTION_TYPES } from '@shared/data/realEstateOptions'
import type { ContractFormErrors, ContractFormValues } from '../types'

type Props = {
  values: ContractFormValues
  errors: ContractFormErrors
  onChange: <K extends keyof ContractFormValues>(field: K, value: ContractFormValues[K]) => void
}

/**
 * Shared by CreateContractScreen and ContractDetailScreen's edit mode.
 * Submitting happens via FormScreenContainer's persistent header save
 * action (screen-level, not rendered here) — no duplicate bottom submit
 * button.
 */
export function ContractForm({ values, errors, onChange }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.form}>
      <AutocompleteInput
        label="نوع قرارداد"
        value={values.type}
        onChangeValue={(value) => onChange('type', value)}
        suggestions={PROPERTY_TRANSACTION_TYPES}
        placeholder="فروش، اجاره..."
        errorMessage={errors.type}
      />
      <MoneyInput
        label="مبلغ (تومان)"
        value={values.amount}
        onChangeValue={(value) => onChange('amount', value)}
        errorMessage={errors.amount}
      />
      <FormRow>
        <DateInput
          label="تاریخ شروع"
          required
          value={values.startDate}
          onChangeText={(value) => onChange('startDate', value)}
          errorMessage={errors.startDate}
        />
        <DateInput
          label="تاریخ پایان"
          required
          value={values.endDate}
          onChangeText={(value) => onChange('endDate', value)}
          errorMessage={errors.endDate}
        />
      </FormRow>
      <TextInput
        label="کد رهگیری"
        value={values.trackingCode}
        onChangeText={(value) => onChange('trackingCode', value)}
        placeholder="کد رهگیری ثبت‌شده در سامانه ثبت معاملات املاک (اختیاری)"
        errorMessage={errors.trackingCode}
      />
      <TextInput
        label="یادداشت"
        value={values.notes}
        onChangeText={(value) => onChange('notes', value)}
        placeholder="توضیحات تکمیلی (اختیاری)"
        errorMessage={errors.notes}
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
