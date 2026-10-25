import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import {
  AutocompleteInput,
  Checkbox,
  ChoiceChips,
  FormRow,
  MoneyInput,
  MultiChoiceChips,
  NumberStepper,
  TextInput
} from '@shared/components'
import { IRANIAN_CITIES } from '@shared/data/iranianCities'
import { PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { APPLICANT_KINDS, joinApplicantKinds, parseApplicantKinds } from '@shared/utils/dealKinds'
import { shortTomanRange } from '@shared/utils/shortMoney'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = {
  values: ApplicantFormValues
  errors: ApplicantFormErrors
  onChange: <K extends keyof ApplicantFormValues>(field: K, value: ApplicantFormValues[K]) => void
  /**
   * v1.4.0 (design batch 3, like the new file): the new-applicant screen
   * shows one step at a time (1 who, 2 what they want, 3 size and notes);
   * edit mode leaves it unset and shows every step on one page.
   */
  step?: ApplicantFormStep
}

export type ApplicantFormStep = 1 | 2 | 3

/** Which step each field lives on — the new-applicant screen jumps to the first step with an error. */
export const APPLICANT_FIELD_STEP: Record<keyof ApplicantFormValues, ApplicantFormStep> = {
  fullName: 1,
  phoneNumber: 1,
  city: 1,
  preferredTransactionType: 2,
  preferredPropertyType: 2,
  minBudget: 2,
  maxBudget: 2,
  depositAmount: 2,
  rentAmount: 2,
  isConvertible: 2,
  rooms: 3,
  minArea: 3,
  maxArea: 3,
  description: 3
}

function amount(raw: string): number | null {
  const n = Number(raw)
  return raw && Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Shared by CreateApplicantScreen and ApplicantDetailScreen's edit mode —
 * same fields, same validation.
 */
export function ApplicantForm({ values, errors, onChange, step }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  // Amin #5327: one or more modes, each with its own fields — buy and barter the budget, رهن و اجاره the رهن/اجاره
  const modes = parseApplicantKinds(values.preferredTransactionType)
  const showRentFields = modes.includes('رهن و اجاره')
  const priceMode = modes.includes('خرید') || modes.includes('تهاتر')
  // an older tenant whose budget was the رهن keeps seeing (and can clear) it
  const showBudget =
    modes.length === 0 || priceMode || Boolean(values.minBudget || values.maxBudget)
  const show = (s: ApplicantFormStep): boolean => step === undefined || step === s
  const budgetWords = shortTomanRange(amount(values.minBudget), amount(values.maxBudget))

  return (
    <View style={styles.form}>
      {show(1) ? (
        <>
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
            label="شهر"
            required
            value={values.city}
            onChangeValue={(value) => onChange('city', value)}
            suggestions={IRANIAN_CITIES}
            placeholder="تهران"
            errorMessage={errors.city}
          />
        </>
      ) : null}

      {show(2) ? (
        <>
          <MultiChoiceChips
            label="نوع معامله"
            options={APPLICANT_KINDS}
            values={modes}
            onChange={(next) => onChange('preferredTransactionType', joinApplicantKinds(next))}
            helperText="می‌توانید چند مورد را با هم انتخاب کنید"
            errorMessage={errors.preferredTransactionType}
          />
          <ChoiceChips
            label="نوع ملک"
            options={PROPERTY_TYPES}
            value={values.preferredPropertyType}
            onChange={(value) => onChange('preferredPropertyType', value)}
            errorMessage={errors.preferredPropertyType}
            allowOther
          />
          {showRentFields ? (
            <>
              <FormRow>
                <MoneyInput
                  label="رهن موردنظر (تومان)"
                  required
                  value={values.depositAmount}
                  onChangeValue={(value) => onChange('depositAmount', value)}
                  errorMessage={errors.depositAmount}
                />
                <MoneyInput
                  label="اجارهٔ موردنظر (تومان)"
                  value={values.rentAmount}
                  onChangeValue={(value) => onChange('rentAmount', value)}
                  errorMessage={errors.rentAmount}
                />
              </FormRow>
              <Checkbox
                label="رهن و اجارهٔ قابل تبدیل هم مدنظر است"
                value={values.isConvertible}
                onChange={(value) => onChange('isConvertible', value)}
              />
            </>
          ) : null}
          {showBudget ? (
            <View style={styles.group}>
              <FormRow>
                <MoneyInput
                  label={
                    priceMode && showRentFields ? 'بودجهٔ خرید از (تومان)' : 'بودجه از (تومان)'
                  }
                  required={priceMode}
                  value={values.minBudget}
                  onChangeValue={(value) => onChange('minBudget', value)}
                  errorMessage={errors.minBudget}
                />
                <MoneyInput
                  label="تا (تومان)"
                  value={values.maxBudget}
                  onChangeValue={(value) => onChange('maxBudget', value)}
                  errorMessage={errors.maxBudget}
                />
              </FormRow>
              {budgetWords ? (
                <Text style={[theme.typography('bodySm'), styles.words]}>{budgetWords}</Text>
              ) : null}
              <Text style={[theme.typography('bodySm'), styles.hint]}>
                فایل‌های مناسب همین بازه‌ها خودکار پیشنهاد می‌شوند.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {show(3) ? (
        <>
          <FormRow>
            <TextInput
              label="متراژ از"
              value={values.minArea}
              onChangeText={(value) => onChange('minArea', value)}
              keyboardType="number-pad"
              errorMessage={errors.minArea}
            />
            <TextInput
              label="تا (متر)"
              value={values.maxArea}
              onChangeText={(value) => onChange('maxArea', value)}
              keyboardType="number-pad"
              errorMessage={errors.maxArea}
            />
          </FormRow>
          <NumberStepper
            label="تعداد اتاق"
            value={values.rooms}
            onChange={(value) => onChange('rooms', value)}
            min={0}
            max={10}
            errorMessage={errors.rooms}
          />
          <TextInput
            label="توضیحات"
            value={values.description}
            onChangeText={(value) => onChange('description', value)}
            placeholder="مثلاً محله‌های دلخواه، طبقه، پارکینگ"
            errorMessage={errors.description}
          />
        </>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    form: {
      gap: theme.spacing.space5
    },
    group: { gap: theme.spacing.space2 },
    words: { color: theme.colors.success, alignSelf: start },
    hint: { color: theme.colors.onSurfaceVariant, alignSelf: start }
  })
}
