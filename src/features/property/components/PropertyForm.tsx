import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = {
  values: PropertyFormValues
  errors: PropertyFormErrors
  onChange: <K extends keyof PropertyFormValues>(field: K, value: PropertyFormValues[K]) => void
  onSubmit: () => void
  submitLabel: string
  isSubmitting: boolean
}

/** Shared by CreatePropertyScreen and PropertyDetailScreen's edit mode — same fields, same validation. */
export function PropertyForm({
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
        label="عنوان پرونده"
        value={values.title}
        onChangeText={(value) => onChange('title', value)}
        placeholder="مثلاً آپارتمان دو خوابه ولیعصر"
        errorMessage={errors.title}
      />
      <TextInput
        label="نوع ملک"
        value={values.propertyType}
        onChangeText={(value) => onChange('propertyType', value)}
        placeholder="آپارتمان، ویلا، زمین..."
        errorMessage={errors.propertyType}
      />
      <TextInput
        label="نوع معامله"
        value={values.transactionType}
        onChangeText={(value) => onChange('transactionType', value)}
        placeholder="فروش، رهن و اجاره..."
        errorMessage={errors.transactionType}
      />
      <TextInput
        label="شهر"
        value={values.city}
        onChangeText={(value) => onChange('city', value)}
        placeholder="تهران"
        errorMessage={errors.city}
      />
      <TextInput
        label="آدرس"
        value={values.address}
        onChangeText={(value) => onChange('address', value)}
        placeholder="خیابان، کوچه، پلاک"
        errorMessage={errors.address}
      />
      <TextInput
        label="قیمت (تومان)"
        value={values.price}
        onChangeText={(value) => onChange('price', value)}
        keyboardType="number-pad"
        errorMessage={errors.price}
      />
      <TextInput
        label="متراژ (متر مربع)"
        value={values.area}
        onChangeText={(value) => onChange('area', value)}
        keyboardType="number-pad"
        errorMessage={errors.area}
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
