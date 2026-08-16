import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { FormScreenContainer } from '@shared/components'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { useApplicantService } from '../hooks/useApplicantService'
import { ApplicantForm } from '../components/ApplicantForm'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateApplicant'>

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

  useUnsavedChangesGuard(navigation, isDirty)

  function handleChange<K extends keyof ApplicantFormValues>(
    field: K,
    value: ApplicantFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
    setIsDirty(true)
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !session) {
      return
    }
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const applicant = await service.createApplicant(session.userId, values)
      setIsDirty(false)
      navigation.replace('ApplicantDetail', { applicantId: applicant.id })
    } catch (caughtError) {
      if (caughtError instanceof ApplicantValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ثبت متقاضی با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer
      onBack={() => navigation.goBack()}
      headerTitle="افزودن متقاضی"
      onSave={handleSubmit}
      isSaving={isSubmitting}
    >
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      <ApplicantForm values={values} errors={errors} onChange={handleChange} />
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
    }
  })
}
