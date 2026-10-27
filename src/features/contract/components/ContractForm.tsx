import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { ChipGroup, DateInput, FormRow, MoneyInput, TextInput } from '@shared/components'
import { CONTRACT_KINDS, type ContractFormErrors, type ContractFormValues } from '../types'

const KIND_OPTIONS = CONTRACT_KINDS.map((k) => ({ value: k, label: k }))

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
      {/* Amin #5295: خرید و فروش, رهن و اجاره or تهاتر */}
      <ChipGroup
        label="نوع قرارداد"
        options={KIND_OPTIONS}
        value={values.type as (typeof CONTRACT_KINDS)[number]}
        onChange={(value) => value && onChange('type', value)} // one kind is always chosen
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
        placeholder="اختیاری"
        helperText="کد ثبت‌شده در سامانهٔ ثبت معاملات املاک"
        errorMessage={errors.trackingCode}
      />
      <TextInput
        label="یادداشت"
        multiline
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
