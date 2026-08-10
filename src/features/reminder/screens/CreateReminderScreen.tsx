import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { FormScreenContainer } from '@shared/components'
import { useReminderService } from '../hooks/useReminderService'
import { ReminderForm } from '../components/ReminderForm'
import { ReminderValidationError } from '../validation/ReminderValidationError'
import type { ReminderFormErrors, ReminderFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateReminder'>

const EMPTY_VALUES: ReminderFormValues = {
  title: '',
  description: '',
  date: '',
  time: ''
}

export function CreateReminderScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = useReminderService()
  const { propertyId, applicantId, dealId } = route.params ?? {}
  const [values, setValues] = useState<ReminderFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<ReminderFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange<K extends keyof ReminderFormValues>(
    field: K,
    value: ReminderFormValues[K]
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
      const reminder = await service.createReminder(session.userId, values, {
        propertyId,
        applicantId,
        dealId
      })
      navigation.replace('ReminderDetail', { reminderId: reminder.id })
    } catch (caughtError) {
      if (caughtError instanceof ReminderValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ثبت یادآوری با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer headerTitle="افزودن یادآوری" onSave={handleSubmit} isSaving={isSubmitting}>
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      <ReminderForm
        values={values}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="ثبت یادآوری"
        isSubmitting={isSubmitting}
      />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    submitError: {
      color: theme.colors.error
    }
  })
}
