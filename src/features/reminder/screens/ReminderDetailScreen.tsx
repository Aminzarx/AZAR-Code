import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { formatDateTime } from '@shared/utils/formatDate'
import {
  Button,
  Card,
  ConfirmDialog,
  ContextHeader,
  ErrorState,
  FormScreenContainer,
  LoadingIndicator
} from '@shared/components'
import { useReminderDetail } from '../hooks/useReminderDetail'
import { useReminderService } from '../hooks/useReminderService'
import { useReminderContext } from '../hooks/useReminderContext'
import { ReminderForm } from '../components/ReminderForm'
import { ReminderValidationError } from '../validation/ReminderValidationError'
import { toFormDateTime } from '../validation/reminderValidation'
import type { Reminder, ReminderFormErrors, ReminderFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ReminderDetail'>

function toFormValues(reminder: Reminder): ReminderFormValues {
  const { date, time } = toFormDateTime(reminder.remindAt)
  return {
    title: reminder.title,
    description: reminder.description ?? '',
    date,
    time,
    reminderType: reminder.reminderType
  }
}

export function ReminderDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { reminderId } = route.params
  const { reminder, isLoading, error, refetch } = useReminderDetail(reminderId)
  const service = useReminderService()
  const { session } = useAuth()
  const context = useReminderContext(reminder)
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ReminderFormValues | null>(null)
  const [initialValues, setInitialValues] = useState<ReminderFormValues | null>(null)
  const [errors, setErrors] = useState<ReminderFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  // See CreatePropertyScreen's identical guard — `isSubmitting` is React
  // state, so two presses in the same tick can both read it as `false`
  // before either commits. This ref is checked and set synchronously.
  const isSubmittingRef = useRef(false)

  const isDirty = Boolean(
    values && initialValues && JSON.stringify(values) !== JSON.stringify(initialValues)
  )

  function startEditing(): void {
    if (!reminder) {
      return
    }
    const formValues = toFormValues(reminder)
    setValues(formValues)
    setInitialValues(formValues)
    setErrors({})
    setSubmitError(null)
    setIsEditing(true)
  }

  // Keeps the header's "ذخیره شد" flash visible for a moment before
  // closing the edit form — closing immediately (as the plain success path
  // would) would unmount the header before the flash ever renders.
  useEffect(() => {
    if (!justSaved) {
      return
    }
    const timer = setTimeout(() => {
      setJustSaved(false)
      setIsEditing(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [justSaved])

  function handleChange<K extends keyof ReminderFormValues>(
    field: K,
    value: ReminderFormValues[K]
  ): void {
    setValues((current) => (current ? { ...current, [field]: value } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !reminder || !values || isSubmittingRef.current) {
      return
    }
    isSubmittingRef.current = true
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await service.updateReminder(reminder.id, values, {
        propertyId: reminder.propertyId,
        applicantId: reminder.applicantId,
        dealId: reminder.dealId
      })
      setJustSaved(true)
      refetch()
    } catch (caughtError) {
      if (caughtError instanceof ReminderValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ذخیره تغییرات با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleToggleDone(): Promise<void> {
    if (!service || !reminder) {
      return
    }
    await service.setDone(reminder.id, !reminder.isDone, session?.userId)
    refetch()
  }

  // Same resolution priority as useReminderContext: a deal-linked reminder
  // leads to the deal (the richer destination — it carries both the
  // property and applicant), otherwise whichever single record it's tied to.
  function handleContextPress(): void {
    if (!reminder) {
      return
    }
    if (reminder.dealId) {
      navigateAcrossTabs(navigation, 'DealDetail', { dealId: reminder.dealId })
    } else if (reminder.propertyId) {
      navigateAcrossTabs(navigation, 'PropertyDetail', { propertyId: reminder.propertyId })
    } else if (reminder.applicantId) {
      navigateAcrossTabs(navigation, 'ApplicantDetail', { applicantId: reminder.applicantId })
    }
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
      onBack={() => navigation.goBack()}
      headerTitle={isEditing ? 'ویرایش یادآوری' : 'جزئیات یادآوری'}
      onSave={isEditing ? handleSubmit : undefined}
      isSaving={isSubmitting}
      isDirty={isDirty}
      saveSucceeded={justSaved}
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
          <ReminderForm values={values} errors={errors} onChange={handleChange} />
        </>
      ) : (
        <Card variant="detail">
          <Text style={[theme.typography('headlineMd'), styles.title]}>{reminder.title}</Text>
          {context ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={context.primary}
              onPress={handleContextPress}
              style={styles.context}
            >
              <ContextHeader primary={context.primary} secondary={context.secondary} />
            </Pressable>
          ) : null}
          <Text style={[theme.typography('bodyMd'), styles.value]}>
            {formatDateTime(reminder.remindAt)}
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
      marginBottom: theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    context: {
      marginBottom: theme.spacing.space3
    },
    value: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    submitError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    actionButton: {
      marginTop: theme.spacing.space3
    }
  })
}
