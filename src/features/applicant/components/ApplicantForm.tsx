import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = {
  values: ApplicantFormValues
  errors: ApplicantFormErrors
  onChange: <K extends keyof ApplicantFormValues>(field: K, value: ApplicantFormValues[K]) => void
  onSubmit: () => void
  submitLabel: string
  isSubmitting: boolean
}

/** Shared by CreateApplicantScreen and ApplicantDetailScreen's edit mode — same fields, same validation. */
export function ApplicantForm({
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
        label="نام و نام خانوادگی"
        value={values.fullName}
        onChangeText={(value) => onChange('fullName', value)}
        placeholder="مثلاً علی رضایی"
        errorMessage={errors.fullName}
      />
      <TextInput
        label="شماره تماس"
        value={values.phoneNumber}
        onChangeText={(value) => onChange('phoneNumber', value)}
        placeholder="09121234567"
        keyboardType="phone-pad"
        errorMessage={errors.phoneNumber}
      />
      <TextInput
        label="ایمیل"
        value={values.email}
        onChangeText={(value) => onChange('email', value)}
        placeholder="اختیاری"
        errorMessage={errors.email}
      />
      <TextInput
        label="نوع متقاضی"
        value={values.applicantType}
        onChangeText={(value) => onChange('applicantType', value)}
        placeholder="حقیقی، حقوقی..."
        errorMessage={errors.applicantType}
      />
      <TextInput
        label="نوع معامله مدنظر"
        value={values.preferredTransactionType}
        onChangeText={(value) => onChange('preferredTransactionType', value)}
        placeholder="فروش، رهن و اجاره..."
        errorMessage={errors.preferredTransactionType}
      />
      <TextInput
        label="نوع ملک مدنظر"
        value={values.preferredPropertyType}
        onChangeText={(value) => onChange('preferredPropertyType', value)}
        placeholder="آپارتمان، ویلا..."
        errorMessage={errors.preferredPropertyType}
      />
      <TextInput
        label="شهر"
        value={values.city}
        onChangeText={(value) => onChange('city', value)}
        placeholder="تهران"
        errorMessage={errors.city}
      />
      <TextInput
        label="حداقل بودجه (تومان)"
        value={values.minBudget}
        onChangeText={(value) => onChange('minBudget', value)}
        keyboardType="number-pad"
        errorMessage={errors.minBudget}
      />
      <TextInput
        label="حداکثر بودجه (تومان)"
        value={values.maxBudget}
        onChangeText={(value) => onChange('maxBudget', value)}
        keyboardType="number-pad"
        errorMessage={errors.maxBudget}
      />
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
