import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[theme.typography('titleMd'), styles.heading]}>افزودن یادآوری</Text>
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
