import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import {
  AutocompleteInput,
  Checkbox,
  ChoiceChips,
  MoneyInput,
  NumberStepper,
  TextInput
} from '@shared/components'
import { IRANIAN_CITIES } from '@shared/data/iranianCities'
import {
  BARTER_ITEM_OPTIONS,
  PROPERTY_TRANSACTION_TYPES,
  PROPERTY_TYPES
} from '@shared/data/realEstateOptions'
import { isRentOrMortgageTransaction } from '@shared/utils/rentStatus'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = {
  values: PropertyFormValues
  errors: PropertyFormErrors
  onChange: <K extends keyof PropertyFormValues>(field: K, value: PropertyFormValues[K]) => void
  /**
   * v3.0.0 (Amin #4180/#4211): the new-file screen shows one step at a time
   * (1 type and place, 2 details and price, 3 title and notes); edit mode
   * leaves it unset and shows every step on one page.
   */
  step?: PropertyFormStep
}

export type PropertyFormStep = 1 | 2 | 3

/** Which step each field lives on — the new-file screen jumps to the first step with an error. */
export const PROPERTY_FIELD_STEP: Record<keyof PropertyFormValues, PropertyFormStep> = {
  transactionType: 1,
  propertyType: 1,
  city: 1,
  address: 1,
  price: 2,
  depositAmount: 2,
  rentAmount: 2,
  isConvertible: 2,
  barterItems: 2,
  barterOtherDescription: 2,
  area: 2,
  rooms: 2,
  title: 3,
  description: 3
}

/**
 * Shared by CreatePropertyScreen and PropertyDetailScreen's edit mode —
 * same fields, same validation. Submitting happens via
 * FormScreenContainer's persistent header save action (screen-level,
 * not rendered here) — no duplicate bottom submit button.
 */
export function PropertyForm({ values, errors, onChange, step }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const showRentFields = isRentOrMortgageTransaction(values.transactionType)
  const showBarterFields = values.transactionType.trim() === 'تهاتر'
  const show = (s: PropertyFormStep): boolean => step === undefined || step === s

  function toggleBarterItem(item: string, checked: boolean): void {
    const next = checked
      ? [...values.barterItems, item]
      : values.barterItems.filter((existing) => existing !== item)
    onChange('barterItems', next)
    if (item === 'سایر' && !checked) {
      onChange('barterOtherDescription', '')
    }
  }

  return (
    <View style={styles.form}>
      {show(1) ? (
        <>
          <ChoiceChips
            label="نوع معامله"
            options={PROPERTY_TRANSACTION_TYPES}
            value={values.transactionType}
            onChange={(value) => onChange('transactionType', value)}
            errorMessage={errors.transactionType}
          />
          <ChoiceChips
            label="نوع ملک"
            options={PROPERTY_TYPES}
            value={values.propertyType}
            onChange={(value) => onChange('propertyType', value)}
            errorMessage={errors.propertyType}
            allowOther
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
          <TextInput
            label="آدرس"
            required
            value={values.address}
            onChangeText={(value) => onChange('address', value)}
            placeholder="محله، خیابان، کوچه، پلاک"
            helperText="فقط خودتان می‌بینید"
            errorMessage={errors.address}
          />
        </>
      ) : null}
      {show(2) ? (
        <>
          {/* v2.9.2 — hidden for رهن/اجاره transactions per explicit direction:
          showing a sale "قیمت" field while the broker is entering
          deposit/rent amounts instead is meaningless. */}
          {!showRentFields ? (
            <MoneyInput
              label="قیمت (تومان)"
              value={values.price}
              onChangeValue={(value) => onChange('price', value)}
              errorMessage={errors.price}
            />
          ) : null}
          {showRentFields ? (
            <>
              {/* v3.0.0: one column, as in the approved design */}
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
              <Checkbox
                label="قابل تبدیل رهن و اجاره"
                value={values.isConvertible}
                onChange={(value) => onChange('isConvertible', value)}
              />
            </>
          ) : null}
          {/* v2.9.3 — تهاتر (barter) needs to say what's being offered in
          exchange: a fixed set of common categories plus a free-text
          "سایر" fallback, per explicit direction. */}
          {showBarterFields ? (
            <View style={styles.barterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.barterRow}
              >
                {BARTER_ITEM_OPTIONS.map((item) => (
                  <Checkbox
                    key={item}
                    label={item}
                    value={values.barterItems.includes(item)}
                    onChange={(checked) => toggleBarterItem(item, checked)}
                  />
                ))}
              </ScrollView>
              {values.barterItems.includes('سایر') ? (
                <TextInput
                  label="مورد تهاتر"
                  required
                  value={values.barterOtherDescription}
                  onChangeText={(value) => onChange('barterOtherDescription', value)}
                  placeholder="مثلاً لوازم منزل، طرح تجاری..."
                  errorMessage={errors.barterOtherDescription}
                />
              ) : null}
            </View>
          ) : null}
          <View style={styles.pairRow}>
            <View style={styles.pairItem}>
              <TextInput
                label="متراژ (متر مربع)"
                value={values.area}
                onChangeText={(value) => onChange('area', value)}
                keyboardType="number-pad"
                errorMessage={errors.area}
              />
            </View>
            <NumberStepper
              label="تعداد اتاق"
              value={values.rooms}
              onChange={(value) => onChange('rooms', value)}
              errorMessage={errors.rooms}
            />
          </View>
        </>
      ) : null}
      {show(3) ? (
        <>
          <TextInput
            label="عنوان فایل"
            required
            value={values.title}
            onChangeText={(value) => onChange('title', value)}
            placeholder="مثلاً آپارتمان دو خوابه ولیعصر"
            // Amin #5064: one short line even on a small phone
            helperText={step === 3 ? 'پیشنهاد از نوع ملک، اتاق‌ها و آدرس؛ قابل ویرایش' : undefined}
            errorMessage={errors.title}
          />
          <TextInput
            label="توضیحات"
            value={values.description}
            onChangeText={(value) => onChange('description', value)}
            placeholder="مثلاً نورگیر، بازسازی‌شده، سند تک‌برگ"
            errorMessage={errors.description}
          />
        </>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: {
      gap: theme.spacing.space5
    },
    pairRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      alignItems: 'flex-start'
    },
    pairItem: {
      flex: 1
    },
    barterSection: {
      gap: theme.spacing.space3
    },
    // v2.9.6 — a 3-column wrap grid still split 5 items across 2 rows;
    // per explicit direction they should all sit in a single row. A
    // horizontal ScrollView keeps every item full-size (no shrinking
    // labels/touch targets) and scrolls on narrower phones instead of
    // wrapping.
    barterRow: {
      flexDirection: 'row',
      gap: theme.spacing.space4
    }
  })
}
