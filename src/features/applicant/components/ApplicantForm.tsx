import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { AutocompleteInput, FormRow, MoneyInput, TextInput } from '@shared/components'
import { IRANIAN_CITIES } from '@shared/data/iranianCities'
import { APPLICANT_TRANSACTION_TYPES, PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = {
  values: ApplicantFormValues
  errors: ApplicantFormErrors
  onChange: <K extends keyof ApplicantFormValues>(field: K, value: ApplicantFormValues[K]) => void
}

/**
 * Shared by CreateApplicantScreen and ApplicantDetailScreen's edit
 * mode — same fields, same validation. Submitting happens via
 * FormScreenContainer's persistent header save action (screen-level,
 * not rendered here) — no duplicate bottom submit button.
 */
export function ApplicantForm({ values, errors, onChange }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.form}>
      <TextInput
        label="نام و نام خانوادگی"
        required
        value={values.fullName}
        onChangeText={(value) => onChange('fullName', value)}
        placeholder="مثلاً علی رضایی"
        errorMessage={errors.fullName}
      />
      <TextInput
        label="شماره تماس"
        required
        value={values.phoneNumber}
        onChangeText={(value) => onChange('phoneNumber', value)}
        placeholder="09121234567"
        keyboardType="phone-pad"
        errorMessage={errors.phoneNumber}
      />
      <AutocompleteInput
        label="نوع معامله مدنظر"
        value={values.preferredTransactionType}
        onChangeValue={(value) => onChange('preferredTransactionType', value)}
        suggestions={APPLICANT_TRANSACTION_TYPES}
        placeholder="خرید، اجاره..."
        errorMessage={errors.preferredTransactionType}
      />
      <AutocompleteInput
        label="نوع ملک مدنظر"
        value={values.preferredPropertyType}
        onChangeValue={(value) => onChange('preferredPropertyType', value)}
        suggestions={PROPERTY_TYPES}
        placeholder="آپارتمان، ویلا..."
        errorMessage={errors.preferredPropertyType}
      />
      <AutocompleteInput
        label="شهر"
        required
        value={values.city}
        onChangeValue={(value) => onChange('city', value)}
        suggestions={IRANIAN_CITIES}
        placeholder="تهران"
        errorMessage={errors.city}
      />
      <FormRow>
        <MoneyInput
          label="حداقل بودجه (تومان)"
          value={values.minBudget}
          onChangeValue={(value) => onChange('minBudget', value)}
          errorMessage={errors.minBudget}
        />
        <MoneyInput
          label="حداکثر بودجه (تومان)"
          value={values.maxBudget}
          onChangeValue={(value) => onChange('maxBudget', value)}
          errorMessage={errors.maxBudget}
        />
      </FormRow>
      <FormRow>
        <TextInput
          label="حداقل متراژ"
          value={values.minArea}
          onChangeText={(value) => onChange('minArea', value)}
          keyboardType="number-pad"
          errorMessage={errors.minArea}
        />
        <TextInput
          label="حداکثر متراژ"
          value={values.maxArea}
          onChangeText={(value) => onChange('maxArea', value)}
          keyboardType="number-pad"
          errorMessage={errors.maxArea}
        />
      </FormRow>
      <TextInput
        label="تعداد اتاق"
        value={values.rooms}
        onChangeText={(value) => onChange('rooms', value)}
        keyboardType="number-pad"
        errorMessage={errors.rooms}
      />
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
