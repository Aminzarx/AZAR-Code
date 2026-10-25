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
  PropertyForm,
  STEP_NAMES,
  stepOfField,
  stepsFor,
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


/** v3.0.0: a starting title from what the broker already chose («آپارتمان ۲ خوابه ۹۵ متری، تهران»). */
function suggestTitle(v: PropertyFormValues): string {
  const parts = [v.propertyType.trim() || 'ملک']
  if (v.rooms) parts.push(`${toPersianDigits(v.rooms)} خوابه`)
  if (v.area) parts.push(`${toPersianDigits(v.area)} متری`)
  const city = v.city.trim()
  return city ? `${parts.join(' ')}، ${city}` : parts.join(' ')
}

const REQUIRED = 'این مورد لازم است.'

/**
 * v3.0.0 (Amin #4180/#4211): a new file in short steps with one big
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
  const [step, setStep] = useState<PropertyFormStep>('place')
  // Amin #5240: a step for each chosen deal kind, so the count follows the chips on the first step
  const steps = stepsFor(values)
  const stepIndex = Math.max(0, steps.indexOf(step))
  const isLast = stepIndex === steps.length - 1
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

  /** This step's own errors: the full check, kept to the fields that live on the current step. */
  function errorsOnStep(current: PropertyFormStep): PropertyFormErrors {
    const all = validatePropertyForm(values).errors ?? {}
    const onStep: PropertyFormErrors = {}
    for (const field of Object.keys(all) as Array<keyof PropertyFormValues>) {
      if (field !== 'title' && stepOfField(field, values) === current) onStep[field] = all[field]
    }
    // an empty city/address keeps the short step message
    if (onStep.city && !values.city.trim()) onStep.city = REQUIRED
    if (onStep.address && !values.address.trim()) onStep.address = REQUIRED
    return onStep
  }

  function handleNext(): void {
    const stepErrors = errorsOnStep(step)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      return
    }
    const next = steps[stepIndex + 1]
    if (next === 'title' && !values.title.trim()) {
      setValues((current) => ({ ...current, title: suggestTitle(current) }))
    }
    setStep(next)
  }

  function handleBack(): void {
    if (stepIndex > 0) {
      setErrors({})
      setStep(steps[stepIndex - 1])
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
        const onSteps = fields.map((f) => steps.indexOf(stepOfField(f, values))).filter((i) => i >= 0)
        setStep(steps[Math.min(steps.length - 1, ...onSteps)])
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
            {steps.map((name, n) => (
              <View key={name} style={[styles.bar, n <= stepIndex && styles.barOn]} />
            ))}
          </View>
          <Text style={[theme.typography('bodySm'), styles.stepText]}>
            {`مرحلهٔ ${toPersianDigits(String(stepIndex + 1))} از ${toPersianDigits(String(steps.length))} · `}
            <Text style={[theme.typography('labelMd'), styles.stepName]}>{STEP_NAMES[step]}</Text>
          </Text>
        </View>
      }
      footer={
        <View style={{ gap: theme.spacing.space3 }}>
          {/* Amin #5170: on the photos step the «افزودن عکس» button sits right above «ادامه» */}
          {step === 'photos' ? <PhotoAddButton adder={photoAdder} /> : null}
          {!isLast ? (
            <Button
              label={`ادامه: ${STEP_NAMES[steps[stepIndex + 1]]}`}
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
      {step === 'photos' ? (
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
