import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FormScreenContainer,
  LoadingIndicator,
  StatusBadge
} from '@shared/components'
import { SuggestedPropertiesSection } from '@features/matching/components/SuggestedPropertiesSection'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { useApplicantDetail } from '../hooks/useApplicantDetail'
import { useApplicantService } from '../hooks/useApplicantService'
import { useApplicantActivity } from '../hooks/useApplicantActivity'
import { ApplicantForm } from '../components/ApplicantForm'
import { ApplicantActivitySection } from '../components/ApplicantActivitySection'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'
import { deriveApplicantStatus } from '../statusDerivation'
import { deriveRentStatusLabel } from '@shared/utils/rentStatus'
import type { Applicant, ApplicantFormErrors, ApplicantFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ApplicantDetail'>

function toFormValues(applicant: Applicant): ApplicantFormValues {
  return {
    fullName: applicant.fullName,
    phoneNumber: applicant.phoneNumber,
    preferredTransactionType: applicant.preferredTransactionType ?? '',
    preferredPropertyType: applicant.preferredPropertyType ?? '',
    city: applicant.city,
    minBudget: applicant.minBudget === null ? '' : String(applicant.minBudget),
    maxBudget: applicant.maxBudget === null ? '' : String(applicant.maxBudget),
    minArea: applicant.minArea === null ? '' : String(applicant.minArea),
    maxArea: applicant.maxArea === null ? '' : String(applicant.maxArea),
    rooms: applicant.rooms === null ? '' : String(applicant.rooms),
    depositAmount: applicant.depositAmount === null ? '' : String(applicant.depositAmount),
    rentAmount: applicant.rentAmount === null ? '' : String(applicant.rentAmount),
    isConvertible: applicant.isConvertible,
    description: applicant.description ?? ''
  }
}

export function ApplicantDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { applicantId } = route.params
  const { applicant, isLoading, error, refetch } = useApplicantDetail(applicantId)
  const activity = useApplicantActivity(applicantId)
  const service = useApplicantService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ApplicantFormValues | null>(null)
  const [errors, setErrors] = useState<ApplicantFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const [isTogglingArchive, setIsTogglingArchive] = useState(false)

  const { unsavedChangesDialogProps } = useUnsavedChangesGuard(navigation, isEditing)

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

  async function handleToggleArchive(): Promise<void> {
    if (!service || !applicant) {
      return
    }
    setSubmitError(null)
    setIsTogglingArchive(true)
    try {
      await service.updateApplicant(
        applicant.id,
        toFormValues(applicant),
        applicant.status === 'archived' ? 'active' : 'archived'
      )
      refetch()
    } catch {
      setSubmitError('تغییر وضعیت بایگانی با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsTogglingArchive(false)
    }
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
      setIsDeleteConfirmVisible(false)
      setSubmitError('حذف متقاضی با مشکل مواجه شد. دوباره تلاش کنید.')
      setIsDeleting(false)
    }
  }

  const derivedStatus =
    applicant && activity.deals && activity.reminders
      ? deriveApplicantStatus(applicant, activity.deals, activity.reminders)
      : null
  const rentStatusLabel = applicant
    ? deriveRentStatusLabel(applicant.depositAmount, applicant.rentAmount)
    : null

  return (
    <FormScreenContainer
      onBack={isEditing ? () => navigation.goBack() : undefined}
      headerTitle={isEditing ? 'ویرایش متقاضی' : undefined}
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
          <ApplicantForm values={values} errors={errors} onChange={handleChange} />
        </>
      ) : (
        <>
          <Card variant="detail">
            <View style={styles.titleRow}>
              <Text
                style={[theme.typography('headlineMd'), styles.title]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {applicant.fullName}
              </Text>
              {derivedStatus ? (
                <StatusBadge label={derivedStatus.label} tone={derivedStatus.tone} />
              ) : null}
            </View>
            <Text style={[theme.typography('bodyMd'), styles.location]}>
              {applicant.city} • {applicant.phoneNumber}
            </Text>

            {/* design-system.md Principle 6 — budget is what a broker
                needs first, promoted above every other detail field. */}
            {applicant.minBudget !== null || applicant.maxBudget !== null ? (
              <View style={styles.headlineStats}>
                <Text style={[theme.typography('headlineMd'), styles.budgetValue]}>
                  {applicant.minBudget?.toLocaleString('fa-IR') ?? '-'} تا{' '}
                  {applicant.maxBudget?.toLocaleString('fa-IR') ?? '-'} تومان
                </Text>
              </View>
            ) : null}

            {/* v2.9.2 — reverted the v2.9.1 2-column grid back to a
                single-column table (label right / value left), same as
                PropertyDetailScreen — long values didn't fit a 47%-wide
                cell well. */}
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
            {applicant.minArea !== null || applicant.maxArea !== null ? (
              <DetailRow
                label="متراژ مدنظر"
                value={`${applicant.minArea ?? '-'} تا ${applicant.maxArea ?? '-'} متر`}
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
            {rentStatusLabel ? (
              <DetailRow
                label="وضعیت رهن/اجاره"
                value={rentStatusLabel}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.depositAmount !== null ? (
              <DetailRow
                label="میزان رهن موردنظر"
                value={`${applicant.depositAmount.toLocaleString('fa-IR')} تومان`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.rentAmount !== null ? (
              <DetailRow
                label="میزان اجاره موردنظر"
                value={`${applicant.rentAmount.toLocaleString('fa-IR')} تومان`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {applicant.isConvertible ? (
              <DetailRow label="قابل تبدیل" value="بله" theme={theme} styles={styles} />
            ) : null}
            {applicant.description ? (
              <DetailRow
                label="توضیحات"
                value={applicant.description}
                theme={theme}
                styles={styles}
              />
            ) : null}

            <View style={styles.actions}>
              <Button
                label="ویرایش"
                onPress={startEditing}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                label={applicant.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی'}
                onPress={handleToggleArchive}
                variant="secondary"
                loading={isTogglingArchive}
                style={styles.actionButton}
              />
              <Button
                label="حذف متقاضی"
                onPress={() => setIsDeleteConfirmVisible(true)}
                variant="destructive"
                loading={isDeleting}
                style={styles.actionButton}
              />
            </View>
            {submitError ? (
              <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
            ) : null}
          </Card>

          <SuggestedPropertiesSection
            applicant={applicant}
            onSelectProperty={(propertyId) => navigation.navigate('PropertyDetail', { propertyId })}
            onDealCreated={(dealId) => navigateAcrossTabs(navigation, 'DealDetail', { dealId })}
            onViewAll={() =>
              navigateAcrossTabs(navigation, 'Matching', { applicantId: applicant.id })
            }
          />

          <ApplicantActivitySection
            deals={activity.deals}
            reminders={activity.reminders}
            isLoading={activity.isLoading}
            error={activity.error}
            onRetry={activity.refetch}
          />
        </>
      )}

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="حذف متقاضی"
        description="این متقاضی برای همیشه حذف می‌شود. ادامه می‌دهید؟"
        confirmLabel="حذف"
        destructive
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmVisible(false)}
      />
      <ConfirmDialog {...unsavedChangesDialogProps} />
    </FormScreenContainer>
  )
}

type DetailRowProps = {
  label: string
  value: string
  theme: Theme
  styles: ReturnType<typeof createStyles>
}

/**
 * v2.9.2 — a real table row (label right / value left, per explicit
 * direction), replacing the earlier stacked label-above-value block.
 * RN mirrors `flexDirection: 'row'` under RTL automatically.
 */
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
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.space2
    },
    // design-system.md §10 — rides inline in a row beside the status
    // badge, so it needs flexShrink (overflow safety) instead of
    // alignSelf (that rule is for standalone column-level Text only).
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    location: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    // design-system.md Principle 6 — the one deliberately "loud" block on
    // this screen: budget, promoted above every other field.
    headlineStats: {
      marginTop: theme.spacing.space5,
      marginBottom: theme.spacing.space2
    },
    budgetValue: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.space4,
      marginTop: theme.spacing.space2,
      paddingBottom: theme.spacing.space2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 0
    },
    value: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      textAlign: theme.isRTL ? 'left' : 'right'
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    submitError: {
      color: theme.colors.error,
      marginTop: theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space5
    },
    actionButton: {
      flex: 1
    }
  })
}
