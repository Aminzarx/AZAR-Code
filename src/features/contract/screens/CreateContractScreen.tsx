import React, { useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ChipGroup, FormScreenContainer, RecordPicker } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { PhotoEditor } from '@features/photos/components/PhotoEditor'
import { PhotoAddButton, usePhotoAdder } from '@features/photos/components/PhotoAddButton'
import { usePhotoRepository } from '@features/photos/hooks/usePhotoRepository'
import type { EditorPhoto } from '@features/photos/photoList'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { useContractService } from '../hooks/useContractService'
import { ContractForm } from '../components/ContractForm'
import { ContractValidationError } from '../validation/ContractValidationError'
import { validateContractForm } from '../validation/contractValidation'
import { hasRenewalReminder, type ContractFormErrors, type ContractFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateContract'>

const EMPTY_VALUES: ContractFormValues = {
  // Amin #5295: خرید و فروش, رهن و اجاره or تهاتر (رهن و اجاره first, the usual one)
  type: 'رهن و اجاره',
  amount: '',
  startDate: '',
  endDate: '',
  notes: '',
  trackingCode: ''
}

type ReminderOffset = '0' | '1' | '2' | '3'

const REMINDER_OFFSET_OPTIONS: readonly { value: ReminderOffset; label: string }[] = [
  { value: '0', label: 'بدون یادآور' },
  { value: '1', label: '۱ ماه قبل' },
  { value: '2', label: '۲ ماه قبل' },
  { value: '3', label: '۳ ماه قبل' }
]

/** Amin #5062: a new contract in two steps, the second one its photos */
type ContractStep = 1 | 2
const STEP_NAMES: Record<ContractStep, string> = { 1: 'مشخصات قرارداد', 2: 'عکس‌ها' }

export function CreateContractScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = useContractService()
  const params = route.params ?? {}
  const dealId = params.dealId
  // Amin #5408: «قرارداد تازه» from the contracts list opens this form directly; the file and the applicant (the
  // parties) are then picked here. From a deal they come with it.
  const pickParties = !params.propertyId || !params.applicantId
  const [propertyId, setPropertyId] = useState<string | null>(params.propertyId ?? null)
  const [applicantId, setApplicantId] = useState<string | null>(params.applicantId ?? null)
  const [partyErrors, setPartyErrors] = useState<{ property?: string; applicant?: string }>({})
  const userId = pickParties ? (session?.userId ?? '') : ''
  const { properties } = useProperties(userId, '')
  const { applicants } = useApplicants(userId, '')
  const propertyOptions = useMemo(
    () =>
      (properties ?? []).map((property) => ({
        id: property.id,
        title: property.title,
        subtitle: [property.transactionType, property.city, property.region].filter(Boolean).join('، ')
      })),
    [properties]
  )
  const applicantOptions = useMemo(
    () =>
      (applicants ?? []).map((applicant) => ({
        id: applicant.id,
        title: applicant.fullName,
        subtitle: formatIranPhoneNumberForDisplay(applicant.phoneNumber)
      })),
    [applicants]
  )

  function checkParties(): boolean {
    const missing = {
      property: propertyId ? undefined : 'فایل ملک قرارداد را انتخاب کنید.',
      applicant: applicantId ? undefined : 'طرف قرارداد (متقاضی) را انتخاب کنید.'
    }
    setPartyErrors(missing)
    return !missing.property && !missing.applicant
  }
  const [values, setValues] = useState<ContractFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<ContractFormErrors>({})
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>('0')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<ContractStep>(1)
  const [photos, setPhotos] = useState<EditorPhoto[]>([])
  const photoAdder = usePhotoAdder(photos, setPhotos)
  const photoRepository = usePhotoRepository()
  // A guard beyond `isSubmitting`/the Save button's own disabled state —
  // both are React state, so two presses landing in the same tick (a
  // fast double-tap) can both read `isSubmitting === false` before either
  // commits. A ref is checked and set synchronously instead.
  const isSubmittingRef = useRef(false)

  function handleChange<K extends keyof ContractFormValues>(
    field: K,
    value: ContractFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
    // a field's error goes as soon as it is edited (emulator test 2026-10-24: «این مورد لازم است.» stayed under a filled field)
    setErrors((current) => (current[field as keyof typeof current] ? { ...current, [field]: undefined } : current))
  }

  function handleNext(): void {
    const checked = validateContractForm(values)
    setErrors(checked.errors ?? {})
    const partiesOk = checkParties()
    if (checked.errors || !partiesOk) return
    setStep(2)
  }

  function handleBack(): void {
    if (step === 2) {
      setStep(1)
      return
    }
    navigation.goBack()
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !session || isSubmittingRef.current) {
      return
    }
    if (!propertyId || !applicantId) {
      setStep(1)
      checkParties()
      return
    }
    isSubmittingRef.current = true
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const contract = await service.createContract(
        session.userId,
        { propertyId, applicantId, dealId },
        values
      )
      // Amin #5062: the photos of the «عکس‌ها» step, in their order (their size counts in the contract's tokens)
      if (photos.length > 0) {
        await photoRepository?.replaceFor(session.userId, 'contract', contract.id, photos)
      }
      // Amin #5295: the end-of-contract reminder is only for رهن و اجاره
      const offsetMonths = hasRenewalReminder(values.type) ? Number(reminderOffset) : 0
      if (offsetMonths > 0) {
        // Best-effort — createContract already succeeded, a calendar
        // permission problem shouldn't block navigating to the new
        // contract (setEndDateReminder itself swallows calendar errors).
        await service.setEndDateReminder(contract.id, offsetMonths)
      }
      // v1.4.0 (Amin #4311): after saving, go back to whatever opened the form
      // (the list, a deal, a property…); the new record is there at the top.
      if (navigation.canGoBack?.()) {
        navigation.goBack()
      } else {
        navigation.replace('ContractDetail', { contractId: contract.id })
      }
    } catch (caughtError) {
      if (caughtError instanceof ContractValidationError) {
        setErrors(caughtError.fieldErrors)
        setStep(1)
      } else {
        setSubmitError('ثبت قرارداد با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer
      section="contract"
      onBack={handleBack}
      headerTitle="افزودن قرارداد"
      subheader={
        <View style={styles.progress}>
          <View style={styles.bars}>
            {([1, 2] as const).map((n) => (
              <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
            ))}
          </View>
          <Text style={[theme.typography('bodySm'), styles.stepText]}>
            {`مرحلهٔ ${toPersianDigits(String(step))} از ۲ · `}
            <Text style={[theme.typography('labelMd'), styles.stepName]}>{STEP_NAMES[step]}</Text>
          </Text>
        </View>
      }
      footer={
        step === 1 ? (
          <Button label={`ادامه: ${STEP_NAMES[2]}`} onPress={handleNext} />
        ) : (
          <View style={{ gap: theme.spacing.space3 }}>
            {/* Amin #5170: the «افزودن عکس» button right above the save button */}
            <PhotoAddButton adder={photoAdder} />
            <Button label="ذخیرهٔ قرارداد" onPress={handleSubmit} loading={isSubmitting} />
          </View>
        )
      }
    >
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      {step === 1 ? (
        <>
          {pickParties ? (
            <View style={styles.parties}>
              <RecordPicker
                label="فایل ملک"
                required
                placeholder="انتخاب فایل"
                options={propertyOptions}
                value={propertyId}
                onChange={(id) => {
                  setPropertyId(id)
                  setPartyErrors((current) => ({ ...current, property: undefined }))
                }}
                errorMessage={partyErrors.property}
                emptyText="هنوز فایلی ثبت نشده"
              />
              <RecordPicker
                label="طرف قرارداد (متقاضی)"
                required
                placeholder="انتخاب متقاضی"
                options={applicantOptions}
                value={applicantId}
                onChange={(id) => {
                  setApplicantId(id)
                  setPartyErrors((current) => ({ ...current, applicant: undefined }))
                }}
                errorMessage={partyErrors.applicant}
                emptyText="هنوز متقاضی‌ای ثبت نشده"
              />
            </View>
          ) : null}
          <ContractForm values={values} errors={errors} onChange={handleChange} />
          {hasRenewalReminder(values.type) ? (
            <View style={styles.reminderSection}>
              <ChipGroup
                label="یادآور پایان قرارداد در تقویم گوشی"
                options={REMINDER_OFFSET_OPTIONS}
                value={reminderOffset}
                onChange={(value) => setReminderOffset(value ?? '0')}
              />
            </View>
          ) : null}
        </>
      ) : (
        <PhotoEditor photos={photos} noun="قرارداد" onChange={setPhotos} adder={photoAdder} />
      )}
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    submitError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    parties: {
      gap: theme.spacing.space5,
      marginBottom: theme.spacing.space5
    },
    reminderSection: {
      marginTop: theme.spacing.space5
    },
    // same progress bar as the new-file wizard (CreatePropertyScreen)
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
    stepName: { color: theme.colors.onSurface }
  })
}
