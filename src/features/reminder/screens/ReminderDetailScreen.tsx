import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FormScreenContainer,
  LoadingIndicator
} from '@shared/components'
import { useReminderDetail } from '../hooks/useReminderDetail'
import { useReminderService } from '../hooks/useReminderService'
import { ReminderForm } from '../components/ReminderForm'
import { ReminderValidationError } from '../validation/ReminderValidationError'
import { toFormDateTime } from '../validation/reminderValidation'
import type { Reminder, ReminderFormErrors, ReminderFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ReminderDetail'>

function toFormValues(reminder: Reminder): ReminderFormValues {
  const { date, time } = toFormDateTime(reminder.remindAt)
  return { title: reminder.title, description: reminder.description ?? '', date, time }
}

export function ReminderDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { reminderId } = route.params
  const { reminder, isLoading, error, refetch } = useReminderDetail(reminderId)
  const service = useReminderService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ReminderFormValues | null>(null)
  const [errors, setErrors] = useState<ReminderFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)

  function startEditing(): void {
    if (!reminder) {
      return
    }
    setValues(toFormValues(reminder))
    setErrors({})
    setSubmitError(null)
    setIsEditing(true)
  }

  function handleChange<K extends keyof ReminderFormValues>(
    field: K,
    value: ReminderFormValues[K]
  ): void {
    setValues((current) => (current ? { ...current, [field]: value } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !reminder || !values) {
      return
    }
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await service.updateReminder(reminder.id, values, {
        propertyId: reminder.propertyId,
        applicantId: reminder.applicantId,
        dealId: reminder.dealId
      })
      setIsEditing(false)
      refetch()
    } catch (caughtError) {
      if (caughtError instanceof ReminderValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ذخیره تغییرات با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleDone(): Promise<void> {
    if (!service || !reminder) {
      return
    }
    await service.setDone(reminder.id, !reminder.isDone)
    refetch()
  }

  async function handleDelete(): Promise<void> {
    if (!service || !reminder) {
      return
    }
    setIsDeleting(true)
    try {
      await service.deleteReminder(reminder.id)
      navigation.goBack()
    } catch {
      setIsDeleteConfirmVisible(false)
      setSubmitError('حذف یادآوری با مشکل مواجه شد. دوباره تلاش کنید.')
      setIsDeleting(false)
    }
  }

  return (
    <FormScreenContainer
      headerTitle={isEditing ? 'ویرایش یادآوری' : undefined}
      onSave={isEditing ? handleSubmit : undefined}
      isSaving={isSubmitting}
    >
      {isLoading ? (
        <View style={styles.centeredSection}>
          <LoadingIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centeredSection}>
          <ErrorState
            title="بارگذاری یادآوری با مشکل مواجه شد"
            description={error.message}
            retryLabel="تلاش مجدد"
            onRetry={refetch}
          />
        </View>
      ) : !reminder ? (
        <View style={styles.centeredSection}>
          <ErrorState title="یادآوری پیدا نشد" />
        </View>
      ) : isEditing && values ? (
        <>
          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
          <ReminderForm
            values={values}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitLabel="ذخیره تغییرات"
            isSubmitting={isSubmitting}
          />
        </>
      ) : (
        <Card variant="detail">
          <Text style={[theme.typography('headlineMd'), styles.title]}>{reminder.title}</Text>
          <Text style={[theme.typography('bodyMd'), styles.value]}>
            {new Date(reminder.remindAt).toLocaleDateString('fa-IR')} •{' '}
            {new Date(reminder.remindAt).toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {reminder.description ? (
            <Text style={[theme.typography('bodySm'), styles.description]}>
              {reminder.description}
            </Text>
          ) : null}
          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
          <Button
            label={
              reminder.isDone ? 'علامت‌گذاری به‌عنوان انجام‌نشده' : 'علامت‌گذاری به‌عنوان انجام‌شده'
            }
            onPress={handleToggleDone}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            label="ویرایش"
            onPress={startEditing}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            label="حذف یادآوری"
            onPress={() => setIsDeleteConfirmVisible(true)}
            variant="destructive"
            loading={isDeleting}
            style={styles.actionButton}
          />
        </Card>
      )}

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="حذف یادآوری"
        description="این یادآوری برای همیشه حذف می‌شود. ادامه می‌دهید؟"
        confirmLabel="حذف"
        destructive
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmVisible(false)}
      />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    },
    title: {
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.space3
    },
    value: {
      color: theme.colors.onSurface
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space2
    },
    submitError: {
      color: theme.colors.error
    },
    actionButton: {
      marginTop: theme.spacing.space3
    }
  })
}
