import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { AutocompleteInput, Checkbox, FormRow, MoneyInput, TextInput } from '@shared/components'
import { IRANIAN_CITIES } from '@shared/data/iranianCities'
import { PROPERTY_TRANSACTION_TYPES, PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { isRentOrMortgageTransaction } from '@shared/utils/rentStatus'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = {
  values: PropertyFormValues
  errors: PropertyFormErrors
  onChange: <K extends keyof PropertyFormValues>(field: K, value: PropertyFormValues[K]) => void
}

/**
 * Shared by CreatePropertyScreen and PropertyDetailScreen's edit mode —
 * same fields, same validation. Submitting happens via
 * FormScreenContainer's persistent header save action (screen-level,
 * not rendered here) — no duplicate bottom submit button.
 */
export function PropertyForm({ values, errors, onChange }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const showRentFields = isRentOrMortgageTransaction(values.transactionType)

  return (
    <View style={styles.form}>
      <FormRow>
        <TextInput
          label="عنوان فایل"
          required
          value={values.title}
          onChangeText={(value) => onChange('title', value)}
          placeholder="مثلاً آپارتمان دو خوابه ولیعصر"
          errorMessage={errors.title}
        />
        <AutocompleteInput
          label="نوع ملک"
          value={values.propertyType}
          onChangeValue={(value) => onChange('propertyType', value)}
          suggestions={PROPERTY_TYPES}
          placeholder="آپارتمان، ویلا..."
          errorMessage={errors.propertyType}
        />
      </FormRow>
      <FormRow>
        <AutocompleteInput
          label="نوع معامله"
          value={values.transactionType}
          onChangeValue={(value) => onChange('transactionType', value)}
          suggestions={PROPERTY_TRANSACTION_TYPES}
          placeholder="فروش، رهن..."
          errorMessage={errors.transactionType}
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
      </FormRow>
      <TextInput
        label="آدرس"
        required
        value={values.address}
        onChangeText={(value) => onChange('address', value)}
        placeholder="خیابان، کوچه، پلاک"
        errorMessage={errors.address}
      />
      <MoneyInput
        label="قیمت (تومان)"
        value={values.price}
        onChangeValue={(value) => onChange('price', value)}
        errorMessage={errors.price}
      />
      {showRentFields ? (
        <>
          <FormRow>
            <MoneyInput
              label="میزان رهن (تومان)"
              value={values.depositAmount}
              onChangeValue={(value) => onChange('depositAmount', value)}
              errorMessage={errors.depositAmount}
            />
            <MoneyInput
              label="میزان اجاره (تومان)"
              value={values.rentAmount}
              onChangeValue={(value) => onChange('rentAmount', value)}
              errorMessage={errors.rentAmount}
            />
          </FormRow>
          <Checkbox
            label="قابل تبدیل رهن و اجاره"
            value={values.isConvertible}
            onChange={(value) => onChange('isConvertible', value)}
          />
        </>
      ) : null}
      <FormRow>
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
