import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
// Amin #5182: the gesture-handler ScrollView, so sliding these options wins over the swipe back
import { ScrollView } from 'react-native-gesture-handler'
import { useTheme, type Theme } from '@shared/theme'
import {
  AutocompleteInput,
  Checkbox,
  FormRow,
  ChoiceChips,
  MoneyInput,
  MultiChoiceChips,
  NumberStepper,
  TextInput
} from '@shared/components'
import { IRANIAN_CITIES } from '@shared/data/iranianCities'
import { BARTER_ITEM_OPTIONS, PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { DEAL_KINDS, joinDealKinds, parseDealKinds } from '@shared/utils/dealKinds'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = {
  values: PropertyFormValues
  errors: PropertyFormErrors
  onChange: <K extends keyof PropertyFormValues>(field: K, value: PropertyFormValues[K]) => void
  /**
   * v3.0.0 (Amin #4180/#4211): the new-file screen shows one step at a time; edit mode leaves it unset and shows
   * every step on one page. Amin #5240: one step per chosen deal kind (sale, رهن و اجاره, barter), see stepsFor.
   */
  step?: PropertyFormStep
}

export type PropertyFormStep = 'place' | 'specs' | 'sale' | 'rent' | 'barter' | 'owner' | 'photos' | 'title'

export const STEP_NAMES: Record<PropertyFormStep, string> = {
  place: 'نوع و مکان',
  specs: 'مشخصات',
  sale: 'فروش',
  rent: 'رهن و اجاره',
  barter: 'تهاتر',
  owner: 'مشخصات مالک',
  photos: 'عکس‌ها',
  title: 'عنوان و توضیحات'
}

/** The new-file steps for what is chosen so far: a step for each deal kind, in the kinds' fixed order. */
export function stepsFor(values: PropertyFormValues): PropertyFormStep[] {
  const kinds = parseDealKinds(values.transactionType)
  const dealSteps: PropertyFormStep[] = []
  if (kinds.includes('فروش')) dealSteps.push('sale')
  if (kinds.includes('رهن و اجاره')) dealSteps.push('rent')
  if (kinds.includes('تهاتر')) dealSteps.push('barter')
  return ['place', 'specs', ...dealSteps, 'owner', 'photos', 'title']
}

/** Which step each field lives on — the new-file screen jumps to the first step with an error. */
export function stepOfField(field: keyof PropertyFormValues, values: PropertyFormValues): PropertyFormStep {
  switch (field) {
    case 'transactionType':
    case 'propertyType':
    case 'city':
    case 'region':
    case 'address':
      return 'place'
    case 'area':
    case 'rooms':
      return 'specs'
    case 'price':
      // the sale price, or the file's value on the barter step when it is not for sale
      return parseDealKinds(values.transactionType).includes('فروش') ? 'sale' : 'barter'
    case 'depositAmount':
    case 'rentAmount':
    case 'isConvertible':
      return 'rent'
    case 'barterItems':
    case 'barterOtherDescription':
      return 'barter'
    case 'ownerName':
    case 'ownerPhone':
    case 'ownerNotes':
      return 'owner'
    default:
      return 'title'
  }
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
  const kinds = parseDealKinds(values.transactionType)
  const forSale = kinds.includes('فروش')
  const forRent = kinds.includes('رهن و اجاره')
  const forBarter = kinds.includes('تهاتر')
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
      {show('place') ? (
        <>
          <MultiChoiceChips
            label="نوع معامله"
            required
            options={DEAL_KINDS}
            values={kinds}
            onChange={(next) => onChange('transactionType', joinDealKinds(next))}
            helperText="می‌توانید چند مورد را با هم انتخاب کنید"
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
          {/* Amin #5416: city and district on one row */}
          <FormRow>
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
              label="منطقه"
              value={values.region ?? ''}
              onChangeText={(value) => onChange('region', value)}
              placeholder="مثلاً ونک"
              errorMessage={errors.region}
            />
          </FormRow>
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
      {show('specs') ? (
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
      ) : null}
      {show('sale') && forSale ? (
        <MoneyInput
          label="قیمت فروش (تومان)"
          required
          value={values.price}
          onChangeValue={(value) => onChange('price', value)}
          errorMessage={errors.price}
        />
      ) : null}
      {show('rent') && forRent ? (
        <>
          {/* v3.0.0: one column, as in the approved design; 0 is allowed (رهن کامل / فقط اجاره) */}
          <MoneyInput
            label="میزان رهن (تومان)"
            required
            value={values.depositAmount}
            onChangeValue={(value) => onChange('depositAmount', value)}
            errorMessage={errors.depositAmount}
          />
          <MoneyInput
            label="میزان اجاره (تومان)"
            required
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
      {/* v2.9.3: what is offered in exchange, a fixed set of common categories plus a free-text «سایر» */}
      {show('barter') && forBarter ? (
        <View style={styles.barterSection}>
          <Text style={[theme.typography('labelMd'), styles.label]}>
            مورد تهاتر<Text style={styles.required}> *</Text>
          </Text>
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
          {errors.barterItems ? (
            <Text style={[theme.typography('bodySm'), styles.error]}>{errors.barterItems}</Text>
          ) : null}
          {values.barterItems.includes('سایر') ? (
            <TextInput
              label="توضیح مورد تهاتر"
              multiline
              required
              value={values.barterOtherDescription}
              onChangeText={(value) => onChange('barterOtherDescription', value)}
              placeholder="مثلاً لوازم منزل، طرح تجاری..."
              errorMessage={errors.barterOtherDescription}
            />
          ) : null}
          {/* without a sale the file still needs a value to barter against */}
          {!forSale ? (
            <MoneyInput
              label="ارزش ملک (تومان)"
              required
              value={values.price}
              onChangeValue={(value) => onChange('price', value)}
              errorMessage={errors.price}
            />
          ) : null}
        </View>
      ) : null}
      {show('owner') ? (
        <>
          {/* Amin #5066: the owner on a step of their own; optional, kept as a contact with the «مالک» role */}
          <TextInput
            label="نام مالک"
            value={values.ownerName ?? ''}
            onChangeText={(value) => onChange('ownerName', value)}
            placeholder="مثلاً حسین محمدی"
            helperText="اختیاری؛ فقط خودتان می‌بینید"
            errorMessage={errors.ownerName}
          />
          <TextInput
            label="شماره موبایل مالک"
            value={values.ownerPhone ?? ''}
            onChangeText={(value) => onChange('ownerPhone', value)}
            placeholder="09121234567"
            keyboardType="phone-pad"
            errorMessage={errors.ownerPhone}
          />
          <TextInput
            label="یادداشت دربارهٔ مالک"
            multiline
            value={values.ownerNotes ?? ''}
            onChangeText={(value) => onChange('ownerNotes', value)}
            placeholder="مثلاً عصرها تماس بگیرید، کلید نزد سرایدار"
            errorMessage={errors.ownerNotes}
          />
        </>
      ) : null}
      {show('title') ? (
        <>
          <TextInput
            label="عنوان فایل"
            required
            value={values.title}
            onChangeText={(value) => onChange('title', value)}
            placeholder="مثلاً آپارتمان دو خوابه ولیعصر"
            // Amin #5064: one short line even on a small phone
            helperText={step === 'title' ? 'پیشنهاد از نوع ملک، اتاق‌ها و آدرس؛ قابل ویرایش' : undefined}
            errorMessage={errors.title}
          />
          <TextInput
            label="توضیحات"
            multiline
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
    label: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    required: {
      color: theme.colors.error
    },
    error: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
