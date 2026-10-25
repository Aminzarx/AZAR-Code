import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ConfirmDialog, FormScreenContainer } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { usePropertyService } from '../hooks/usePropertyService'
import {
  PROPERTY_FIELD_STEP,
  PropertyForm,
  type PropertyFormStep
} from '../components/PropertyForm'
import { PropertyValidationError } from '../services/PropertyValidationError'
import { validatePropertyForm } from '../services/propertyValidation'
import { PhotoEditor } from '@features/photos/components/PhotoEditor'
import { PhotoAddButton, usePhotoAdder } from '@features/photos/components/PhotoAddButton'
import { usePhotoRepository } from '@features/photos/hooks/usePhotoRepository'
import type { EditorPhoto } from '@features/photos/photoList'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateProperty'>

const EMPTY_VALUES: PropertyFormValues = {
  title: '',
  propertyType: '',
  transactionType: '',
  city: '',
  address: '',
  price: '',
  area: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  barterItems: [],
  barterOtherDescription: '',
  description: '',
  ownerName: '',
  ownerPhone: '',
  ownerNotes: ''
}

const STEP_NAMES: Record<PropertyFormStep, string> = {
  1: 'نوع و مکان',
  2: 'مشخصات و قیمت',
  3: 'مشخصات مالک',
  4: 'عکس‌ها',
  5: 'عنوان و توضیحات'
}
const LAST_STEP: PropertyFormStep = 5
const REQUIRED = 'این مورد لازم است.'

/** v3.0.0: a starting title from what the broker already chose («آپارتمان ۲ خوابه ۹۵ متری، تهران»). */
function suggestTitle(v: PropertyFormValues): string {
  const parts = [v.propertyType.trim() || 'ملک']
  if (v.rooms) parts.push(`${toPersianDigits(v.rooms)} خوابه`)
  if (v.area) parts.push(`${toPersianDigits(v.area)} متری`)
  const city = v.city.trim()
  return city ? `${parts.join(' ')}، ${city}` : parts.join(' ')
}

/**
 * v3.0.0 (Amin #4180/#4211): a new file in three short steps with one big
 * button at the bottom, instead of one long two-column form with a small
 * save link in the header. The city starts as the city of the broker's
 * last file. Saving and validation are unchanged (PropertyService).
 */
export function CreatePropertyScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = usePropertyService()
  const [values, setValues] = useState<PropertyFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<PropertyFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [step, setStep] = useState<PropertyFormStep>(1)
  const [photos, setPhotos] = useState<EditorPhoto[]>([])
  const photoAdder = usePhotoAdder(photos, (next) => {
    setPhotos(next)
    setIsDirty(true)
  })
  const photoRepository = usePhotoRepository()
  // A guard beyond `isSubmitting`/the Save button's own disabled state —
  // both are React state, so two presses landing in the same tick (a fast
  // double-tap) can both read `isSubmitting === false` before either
  // commits. A ref is checked and set synchronously, so the second call
  // in the same tick still sees it flipped by the first.
  const isSubmittingRef = useRef(false)

  const { markSaved, unsavedChangesDialogProps } = useUnsavedChangesGuard(navigation, isDirty)

  useEffect(() => {
    if (!service || !session) {
      return
    }
    let cancelled = false
    Promise.resolve()
      .then(() => service.listProperties(session.userId))
      .then((list) => {
        const lastCity = list[0]?.city
        if (!cancelled && lastCity) {
          setValues((current) => (current.city ? current : { ...current, city: lastCity }))
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [service, session])

  function handleNext(): void {
    if (step === 1) {
      const stepErrors: PropertyFormErrors = {}
      if (!values.city.trim()) stepErrors.city = REQUIRED
      if (!values.address.trim()) stepErrors.address = REQUIRED
      setErrors(stepErrors)
      if (Object.keys(stepErrors).length > 0) {
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      setErrors({})
      setStep(3)
      return
    }
    if (step === 4) {
      setErrors({})
      if (!values.title.trim()) {
        setValues((current) => ({ ...current, title: suggestTitle(current) }))
      }
      setStep(5)
      return
    }
    // Amin #5066: the owner step may be left empty; once anything is typed, a name and a valid mobile are needed
    const ownerErrors = validatePropertyForm(values).errors
    const stepErrors: PropertyFormErrors = {}
    if (ownerErrors?.ownerName) stepErrors.ownerName = ownerErrors.ownerName
    if (ownerErrors?.ownerPhone) stepErrors.ownerPhone = ownerErrors.ownerPhone
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      return
    }
    setStep(4)
  }

  function handleBack(): void {
    if (step > 1) {
      setErrors({})
      setStep((step - 1) as PropertyFormStep)
      return
    }
    navigation.goBack()
  }

  function handleChange<K extends keyof PropertyFormValues>(
    field: K,
    value: PropertyFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
    // a field's error goes as soon as it is edited (emulator test 2026-10-24: «این مورد لازم است.» stayed under a filled field)
    setErrors((current) => (current[field as keyof typeof current] ? { ...current, [field]: undefined } : current))
    setIsDirty(true)
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !session || isSubmittingRef.current) {
      return
    }
    isSubmittingRef.current = true
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const property = await service.createProperty(session.userId, values)
      // Amin #5062: the photos of the «عکس‌ها» step, in their order
      if (photos.length > 0) {
        await photoRepository?.replaceFor(session.userId, 'property', property.id, photos)
      }
      setIsDirty(false)
      markSaved()
      // v1.4.0 (Amin #4311): after saving, go back to whatever opened the form
      // (the list, a deal, a property…); the new record is there at the top.
      if (navigation.canGoBack?.()) {
        navigation.goBack()
      } else {
        navigation.replace('PropertyDetail', { propertyId: property.id })
      }
    } catch (caughtError) {
      if (caughtError instanceof PropertyValidationError) {
        setErrors(caughtError.fieldErrors)
        const fields = Object.keys(caughtError.fieldErrors) as Array<keyof PropertyFormValues>
        const first = Math.min(LAST_STEP, ...fields.map((f) => PROPERTY_FIELD_STEP[f]))
        setStep(first as PropertyFormStep)
      } else {
        setSubmitError('ثبت فایل با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer
      section="property"
      onBack={handleBack}
      headerTitle="فایل ملکی تازه"
      subheader={
        <View style={styles.progress}>
          <View style={styles.bars}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
            ))}
          </View>
          <Text style={[theme.typography('bodySm'), styles.stepText]}>
            {`مرحلهٔ ${toPersianDigits(String(step))} از ۵ · `}
            <Text style={[theme.typography('labelMd'), styles.stepName]}>{STEP_NAMES[step]}</Text>
          </Text>
        </View>
      }
      footer={
        <View style={{ gap: theme.spacing.space3 }}>
          {/* Amin #5170: on the photos step the «افزودن عکس» button sits right above «ادامه» */}
          {step === 4 ? <PhotoAddButton adder={photoAdder} /> : null}
          {step < LAST_STEP ? (
            <Button
              label={`ادامه: ${STEP_NAMES[(step + 1) as PropertyFormStep]}`}
              onPress={handleNext}
            />
          ) : (
            <Button label="ذخیرهٔ فایل" onPress={handleSubmit} loading={isSubmitting} />
          )}
        </View>
      }
    >
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      {step === 4 ? (
        <PhotoEditor
          photos={photos}
          noun="فایل"
          adder={photoAdder}
          onChange={(next) => {
            setPhotos(next)
            setIsDirty(true)
          }}
        />
      ) : (
        <PropertyForm values={values} errors={errors} onChange={handleChange} step={step} />
      )}
      <ConfirmDialog {...unsavedChangesDialogProps} />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    progress: {
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.spacing.space4,
      gap: theme.spacing.space2,
      backgroundColor: theme.colors.background
    },
    bars: {
      flexDirection: 'row',
      gap: theme.spacing.space2
    },
    bar: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.outlineVariant
    },
    barOn: {
      backgroundColor: theme.colors.primary
    },
    stepText: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    stepName: {
      color: theme.colors.onSurface
    },
    submitError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
