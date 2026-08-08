import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, ErrorState, LoadingIndicator } from '@shared/components'
import { useApplicantDetail } from '../hooks/useApplicantDetail'
import { useApplicantService } from '../hooks/useApplicantService'
import { ApplicantForm } from '../components/ApplicantForm'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'
import type { Applicant, ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ApplicantDetail'>

function toFormValues(applicant: Applicant): ApplicantFormValues {
  return {
    fullName: applicant.fullName,
    phoneNumber: applicant.phoneNumber,
    email: applicant.email ?? '',
    applicantType: applicant.applicantType ?? '',
    preferredTransactionType: applicant.preferredTransactionType ?? '',
    preferredPropertyType: applicant.preferredPropertyType ?? '',
    city: applicant.city,
    minBudget: applicant.minBudget === null ? '' : String(applicant.minBudget),
    maxBudget: applicant.maxBudget === null ? '' : String(applicant.maxBudget),
    minArea: applicant.minArea === null ? '' : String(applicant.minArea),
    maxArea: applicant.maxArea === null ? '' : String(applicant.maxArea),
    rooms: applicant.rooms === null ? '' : String(applicant.rooms),
    description: applicant.description ?? ''
  }
}

export function ApplicantDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { applicantId } = route.params
  const { applicant, isLoading, error, refetch } = useApplicantDetail(applicantId)
  const service = useApplicantService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ApplicantFormValues | null>(null)
  const [errors, setErrors] = useState<ApplicantFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  function startEditing(): void {
    if (!applicant) {
      return
    }
    setValues(toFormValues(applicant))
    setErrors({})
    setSubmitError(null)
    setIsEditing(true)
  }

  function handleChange<K extends keyof ApplicantFormValues>(
    field: K,
    value: ApplicantFormValues[K]
  ): void {
    setValues((current) => (current ? { ...current, [field]: value } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !applicant || !values) {
      return
    }
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await service.updateApplicant(applicant.id, values, applicant.status)
      setIsEditing(false)
      refetch()
    } catch (caughtError) {
      if (caughtError instanceof ApplicantValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ذخیره تغییرات با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function confirmDelete(): void {
    if (!applicant) {
      return
    }
    Alert.alert('حذف متقاضی', 'این متقاضی برای همیشه حذف می‌شود. ادامه می‌دهید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: handleDelete }
    ])
  }

  async function handleDelete(): Promise<void> {
    if (!service || !applicant) {
      return
    }
    setIsDeleting(true)
    try {
      await service.deleteApplicant(applicant.id)
      navigation.goBack()
    } catch {
      setSubmitError('حذف متقاضی با مشکل مواجه شد. دوباره تلاش کنید.')
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری متقاضی با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : !applicant ? (
          <View style={styles.centeredSection}>
            <ErrorState title="متقاضی پیدا نشد" />
          </View>
        ) : isEditing && values ? (
          <>
            {submitError ? (
              <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
            ) : null}
            <ApplicantForm
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
            <Text style={[theme.typography('headlineMd'), styles.title]}>{applicant.fullName}</Text>
            <DetailRow
              label="شماره تماس"
              value={applicant.phoneNumber}
              theme={theme}
              styles={styles}
            />
            {applicant.email ? (
              <DetailRow label="ایمیل" value={applicant.email} theme={theme} styles={styles} />
            ) : null}
            <DetailRow label="شهر" value={applicant.city} theme={theme} styles={styles} />
            {applicant.applicantType ? (
              <DetailRow
                label="نوع متقاضی"
                value={applicant.applicantType}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.preferredTransactionType ? (
              <DetailRow
                label="نوع معامله مدنظر"
                value={applicant.preferredTransactionType}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.preferredPropertyType ? (
              <DetailRow
                label="نوع ملک مدنظر"
                value={applicant.preferredPropertyType}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.minBudget !== null || applicant.maxBudget !== null ? (
              <DetailRow
                label="بودجه"
                value={`${applicant.minBudget?.toLocaleString('fa-IR') ?? '—'} تا ${applicant.maxBudget?.toLocaleString('fa-IR') ?? '—'} تومان`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.minArea !== null || applicant.maxArea !== null ? (
              <DetailRow
                label="متراژ"
                value={`${applicant.minArea ?? '—'} تا ${applicant.maxArea ?? '—'} متر`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.rooms !== null ? (
              <DetailRow
                label="تعداد اتاق"
                value={String(applicant.rooms)}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.description ? (
              <DetailRow
                label="توضیحات"
                value={applicant.description}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {submitError ? (
              <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
            ) : null}
            <Button
              label="ویرایش"
              onPress={startEditing}
              variant="secondary"
              style={styles.editButton}
            />
            <Button
              label="حذف متقاضی"
              onPress={confirmDelete}
              variant="destructive"
              loading={isDeleting}
              style={styles.deleteButton}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

type DetailRowProps = {
  label: string
  value: string
  theme: Theme
  styles: ReturnType<typeof createStyles>
}

function DetailRow({ label, value, theme, styles }: DetailRowProps): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={[theme.typography('labelMd'), styles.label]}>{label}</Text>
      <Text style={[theme.typography('bodyMd'), styles.value]}>{value}</Text>
    </View>
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
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    },
    title: {
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.space3
    },
    detailRow: {
      marginBottom: theme.spacing.space3
    },
    label: {
      color: theme.colors.onSurfaceVariant
    },
    value: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space1
    },
    submitError: {
      color: theme.colors.error
    },
    editButton: {
      marginTop: theme.spacing.space3
    },
    deleteButton: {
      marginTop: theme.spacing.space3
    }
  })
}
