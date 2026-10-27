import React, { useEffect, useRef, useState } from 'react'
import { useLicence } from '@shared/licence/LicenceContext'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
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
  Icon,
  SpecTiles,
  MarqueeText,
  StatusBadge
} from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { moneyLine, shortTomanRange } from '@shared/utils/shortMoney'
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
    region: applicant.region ?? '',
    barterItems: applicant.barterItems ?? [],
    barterOtherDescription: applicant.barterOtherDescription ?? '',
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
  // the stack keeps this screen while other tabs are used: the suggestions are computed again on every return, or an
  // applicant / file added meanwhile is missing (emulator test 2026-10-24)
  const [suggestionsKey, setSuggestionsKey] = useState(0)
  useEffect(() => {
    if (typeof navigation.addListener !== 'function') {
      return undefined
    }
    return navigation.addListener('focus', () => setSuggestionsKey((current) => current + 1))
  }, [navigation])
  // Amin #4906: after the licence ends the file stays readable; its edit actions are hidden
  const { canEdit } = useLicence()
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
  // See CreatePropertyScreen's identical guard — `isSubmitting` is React
  // state, so two presses in the same tick can both read it as `false`
  // before either commits. This ref is checked and set synchronously.
  const isSubmittingRef = useRef(false)

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
    // a field's error goes as soon as it is edited (emulator test 2026-10-24: «این مورد لازم است.» stayed under a filled field)
    setErrors((current) => (current[field as keyof typeof current] ? { ...current, [field]: undefined } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !applicant || !values || isSubmittingRef.current) {
      return
    }
    isSubmittingRef.current = true
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
      isSubmittingRef.current = false
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
  const wantsLine = applicant
    ? [
        [applicant.preferredTransactionType, applicant.preferredPropertyType]
          .filter(Boolean)
          .join(' '),
        [applicant.city, applicant.region].filter(Boolean).join('، ')
      ]
        .filter(Boolean)
        .join(' · ')
    : ''
  const headlineBudget = applicant
    ? (shortTomanRange(applicant.minBudget, applicant.maxBudget) ??
      moneyLine(null, applicant.depositAmount, applicant.rentAmount))
    : null

  return (
    <FormScreenContainer
      section="applicant"
      onBack={() => navigation.goBack()}
      headerTitle={isEditing ? 'ویرایش متقاضی' : 'جزئیات متقاضی'}
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
            {/* v1.3.0 (design batch 2): status, name, what they want and
                where, a call button, the budget as a broker says it with
                the exact amounts under it, then the key facts as tiles. */}
            {derivedStatus ? (
              <View style={styles.tagRow}>
                <StatusBadge label={derivedStatus.label} tone={derivedStatus.tone} />
              </View>
            ) : null}
            <MarqueeText style={[theme.typography('headlineLgMobile'), styles.title]}>
              {applicant.fullName}
            </MarqueeText>
            {wantsLine ? (
              <Text style={[theme.typography('bodyMd'), styles.location]}>{wantsLine}</Text>
            ) : null}
            {applicant.phoneNumber ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`تماس با ${applicant.fullName}`}
                onPress={() => {
                  Linking.openURL(`tel:${applicant.phoneNumber}`).catch(() => undefined)
                }}
                style={styles.callRow}
              >
                <Icon name="phone" size="sm" color={theme.colors.success} />
                <Text style={[theme.typography('labelMd'), styles.callText]}>
                  {toPersianDigits(applicant.phoneNumber)}
                </Text>
              </Pressable>
            ) : null}

            {headlineBudget ? (
              <View style={styles.headlineStats}>
                <Text style={[theme.typography('headlineLgMobile'), styles.budgetValue]}>
                  {headlineBudget}
                </Text>
                {applicant.minBudget !== null || applicant.maxBudget !== null ? (
                  <Text style={[theme.typography('bodySm'), styles.exactValue]}>
                    {[applicant.minBudget, applicant.maxBudget]
                      .filter((amount): amount is number => amount !== null)
                      .map((amount) => amount.toLocaleString('fa-IR'))
                      .join(' تا ')}{' '}
                    تومان
                  </Text>
                ) : null}
              </View>
            ) : null}

            <SpecTiles
              tiles={[
                applicant.minArea !== null || applicant.maxArea !== null
                  ? {
                      label: 'متراژ',
                      value: `${[applicant.minArea, applicant.maxArea]
                        .filter((area): area is number => area !== null)
                        .map((area) => toPersianDigits(String(area)))
                        .join(' تا ')} متر`
                    }
                  : null,
                applicant.rooms !== null
                  ? { label: 'اتاق', value: toPersianDigits(String(applicant.rooms)) }
                  : null,
                applicant.preferredPropertyType
                  ? { label: 'نوع ملک', value: applicant.preferredPropertyType }
                  : null
              ].filter((tile): tile is { label: string; value: string } => tile !== null)}
            />

            {/* v2.9.2 — reverted the v2.9.1 2-column grid back to a
                single-column table (label right / value left), same as
                PropertyDetailScreen — long values didn't fit a 47%-wide
                cell well. */}
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
            {applicant.barterItems && applicant.barterItems.length > 0 ? (
              <DetailRow
                label="مورد تهاتر"
                value={applicant.barterItems
                  .map((item) => (item === 'سایر' && applicant.barterOtherDescription ? applicant.barterOtherDescription : item))
                  .join('، ')}
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

            {canEdit ? (
              <>
                <View style={styles.actions}>
                  <Button label="ویرایش" onPress={startEditing} style={styles.actionButton} />
                  <Button
                    label={applicant.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی'}
                    onPress={handleToggleArchive}
                    variant="secondary"
                    loading={isTogglingArchive}
                    style={styles.actionButton}
                  />
                </View>
                <Button
                  label="حذف متقاضی"
                  onPress={() => setIsDeleteConfirmVisible(true)}
                  variant="destructiveText"
                  loading={isDeleting}
                />
              </>
            ) : null}
            {submitError ? (
              <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
            ) : null}
          </Card>

          {canEdit ? (
            <SuggestedPropertiesSection
              applicant={applicant}
              refreshKey={suggestionsKey}
              onSelectProperty={(propertyId) =>
                navigation.navigate('PropertyDetail', { propertyId })
              }
              onDealCreated={(dealId) => navigateAcrossTabs(navigation, 'DealDetail', { dealId })}
              onViewAll={() =>
                navigateAcrossTabs(navigation, 'Matching', { applicantId: applicant.id })
              }
            />
          ) : null}

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
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space3
    },
    title: {
      color: theme.colors.onSurface,
      alignSelf: 'stretch'
    },
    location: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    callRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.successContainer
    },
    callText: {
      color: theme.colors.onSuccessContainer
    },
    headlineStats: {
      marginTop: theme.spacing.space4,
      marginBottom: theme.spacing.space4,
      gap: 2
    },
    budgetValue: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    exactValue: {
      color: theme.colors.onSurfaceVariant,
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
      textAlign: 'left'
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
      marginTop: theme.spacing.space5,
      marginBottom: theme.spacing.space1
    },
    actionButton: {
      flex: 1
    }
  })
}
