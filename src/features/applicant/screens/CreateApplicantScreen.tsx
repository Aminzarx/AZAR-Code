import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { useApplicantService } from '../hooks/useApplicantService'
import { ApplicantForm } from '../components/ApplicantForm'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'
import type { ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateApplicant'>

const EMPTY_VALUES: ApplicantFormValues = {
  fullName: '',
  phoneNumber: '',
  email: '',
  applicantType: '',
  preferredTransactionType: '',
  preferredPropertyType: '',
  city: '',
  minBudget: '',
  maxBudget: '',
  minArea: '',
  maxArea: '',
  rooms: '',
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

  function handleChange<K extends keyof ApplicantFormValues>(
    field: K,
    value: ApplicantFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[theme.typography('titleMd'), styles.heading]}>افزودن متقاضی</Text>
        {submitError ? (
          <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
        ) : null}
        <ApplicantForm
          values={values}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitLabel="ثبت متقاضی"
          isSubmitting={isSubmitting}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    content: {
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    heading: {
      color: theme.colors.onSurface
    },
    submitError: {
      color: theme.colors.error
    }
  })
}
