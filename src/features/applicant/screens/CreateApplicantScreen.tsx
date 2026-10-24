import React, { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ConfirmDialog, FormScreenContainer } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { useApplicantService } from '../hooks/useApplicantService'
import { APPLICANT_FIELD_STEP, ApplicantForm, type ApplicantFormStep } from '../components/ApplicantForm'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateApplicant'>

// v1.4.0 (design batch 3): a new applicant in three short steps, like a new file
const STEP_NAMES: Record<ApplicantFormStep, string> = {
  1: 'مشخصات و تماس',
  2: 'چه می‌خواهد',
  3: 'متراژ و توضیحات'
}
const REQUIRED = 'این مورد لازم است.'

const EMPTY_VALUES: ApplicantFormValues = {
  fullName: '',
  phoneNumber: '',
  preferredTransactionType: '',
  preferredPropertyType: '',
  city: '',
  minBudget: '',
  maxBudget: '',
  minArea: '',
  maxArea: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  description: ''
}

export function CreateApplicantScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = useApplicantService()
  const [values, setValues] = useState<ApplicantFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<ApplicantFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [step, setStep] = useState<ApplicantFormStep>(1)
  // See CreatePropertyScreen's identical guard — `isSubmitting` is React
  // state, so two presses in the same tick (a fast double-tap) can both
  // read it as `false` before either commits. This ref is checked and
  // set synchronously instead.
  const isSubmittingRef = useRef(false)

  const { markSaved, unsavedChangesDialogProps } = useUnsavedChangesGuard(navigation, isDirty)

  function handleChange<K extends keyof ApplicantFormValues>(
    field: K,
    value: ApplicantFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
    // a field's error goes as soon as it is edited (emulator test 2026-10-24: «این مورد لازم است.» stayed under a filled field)
    setErrors((current) => (current[field as keyof typeof current] ? { ...current, [field]: undefined } : current))
    setIsDirty(true)
  }

  function handleNext(): void {
    if (step === 1) {
      const stepErrors: ApplicantFormErrors = {}
      if (!values.fullName.trim()) stepErrors.fullName = REQUIRED
      if (!values.phoneNumber.trim()) stepErrors.phoneNumber = REQUIRED
      if (!values.city.trim()) stepErrors.city = REQUIRED
      setErrors(stepErrors)
      if (Object.keys(stepErrors).length > 0) {
        return
      }
    } else {
      setErrors({})
    }
    setStep((step + 1) as ApplicantFormStep)
  }

  function handleBack(): void {
    if (step > 1) {
      setErrors({})
      setStep((step - 1) as ApplicantFormStep)
      return
    }
    navigation.goBack()
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
      const applicant = await service.createApplicant(session.userId, values)
      setIsDirty(false)
      markSaved()
      // v1.4.0 (Amin #4311): after saving, go back to whatever opened the form
      // (the list, a deal, a property…); the new record is there at the top.
      if (navigation.canGoBack?.()) {
        navigation.goBack()
      } else {
        navigation.replace('ApplicantDetail', { applicantId: applicant.id })
      }
    } catch (caughtError) {
      if (caughtError instanceof ApplicantValidationError) {
        setErrors(caughtError.fieldErrors)
        const fields = Object.keys(caughtError.fieldErrors) as Array<keyof ApplicantFormValues>
        setStep(Math.min(3, ...fields.map((f) => APPLICANT_FIELD_STEP[f])) as ApplicantFormStep)
      } else {
        setSubmitError('ثبت متقاضی با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer
      section="applicant"
      onBack={handleBack}
      headerTitle="متقاضی تازه"
      subheader={
        <View style={styles.progress}>
          <View style={styles.bars}>
            {([1, 2, 3] as const).map((n) => (
              <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
            ))}
          </View>
          <Text style={[theme.typography('bodySm'), styles.stepText]}>
            {`مرحلهٔ ${toPersianDigits(String(step))} از ۳ · `}
            <Text style={[theme.typography('labelMd'), styles.stepName]}>{STEP_NAMES[step]}</Text>
          </Text>
        </View>
      }
      footer={
        step < 3 ? (
          <Button label={`ادامه: ${STEP_NAMES[(step + 1) as ApplicantFormStep]}`} onPress={handleNext} />
        ) : (
          <Button label="ذخیرهٔ متقاضی" onPress={handleSubmit} loading={isSubmitting} />
        )
      }
    >
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      <ApplicantForm values={values} errors={errors} onChange={handleChange} step={step} />
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
    bars: { flexDirection: 'row', gap: theme.spacing.space2 },
    bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.outlineVariant },
    barOn: { backgroundColor: theme.colors.primary },
    stepText: { color: theme.colors.onSurfaceVariant, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    stepName: { color: theme.colors.onSurface },
    submitError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
