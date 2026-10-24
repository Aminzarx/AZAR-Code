import React, { useRef, useState } from 'react'
import { useLicence } from '@shared/licence/LicenceContext'
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
  SpecTiles,
  MarqueeText,
  StatusBadge
} from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { moneyLine } from '@shared/utils/shortMoney'
import { SuggestedApplicantsSection } from '@features/matching/components/SuggestedApplicantsSection'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { PhotoStrip } from '@features/photos/components/PhotoStrip'
import { usePropertyDetail } from '../hooks/usePropertyDetail'
import { usePropertyService } from '../hooks/usePropertyService'
import { usePropertyActivity } from '../hooks/usePropertyActivity'
import { PropertyForm } from '../components/PropertyForm'
import { PropertyActivitySection } from '../components/PropertyActivitySection'
import { PropertyValidationError } from '../services/PropertyValidationError'
import { derivePropertyStatus } from '../statusDerivation'
import { deriveRentStatusLabel } from '@shared/utils/rentStatus'
import type { Property, PropertyFormErrors, PropertyFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyDetail'>

function toFormValues(property: Property): PropertyFormValues {
  return {
    title: property.title,
    propertyType: property.propertyType ?? '',
    transactionType: property.transactionType ?? '',
    city: property.city,
    address: property.address,
    price: property.price === null ? '' : String(property.price),
    area: property.area === null ? '' : String(property.area),
    rooms: property.rooms === null ? '' : String(property.rooms),
    depositAmount: property.depositAmount === null ? '' : String(property.depositAmount),
    rentAmount: property.rentAmount === null ? '' : String(property.rentAmount),
    isConvertible: property.isConvertible,
    barterItems: property.barterItems,
    barterOtherDescription: property.barterOtherDescription ?? '',
    description: property.description ?? '',
    ownerName: property.owner?.fullName ?? '',
    ownerPhone: property.owner ? formatIranPhoneNumberForDisplay(property.owner.phoneNumber) : '',
    ownerNotes: property.owner?.notes ?? ''
  }
}

export function PropertyDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  // Amin #4906: after the licence ends the file stays readable; its edit actions are hidden
  const { canEdit } = useLicence()
  const styles = createStyles(theme)
  const { propertyId } = route.params
  const { property, isLoading, error, refetch } = usePropertyDetail(propertyId)
  const activity = usePropertyActivity(propertyId)
  const service = usePropertyService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<PropertyFormValues | null>(null)
  const [errors, setErrors] = useState<PropertyFormErrors>({})
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
    if (!property) {
      return
    }
    setValues(toFormValues(property))
    setErrors({})
    setSubmitError(null)
    setIsEditing(true)
  }

  function handleChange<K extends keyof PropertyFormValues>(
    field: K,
    value: PropertyFormValues[K]
  ): void {
    setValues((current) => (current ? { ...current, [field]: value } : current))
    // a field's error goes as soon as it is edited (emulator test 2026-10-24: «این مورد لازم است.» stayed under a filled field)
    setErrors((current) => (current[field as keyof typeof current] ? { ...current, [field]: undefined } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !property || !values || isSubmittingRef.current) {
      return
    }
    isSubmittingRef.current = true
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await service.updateProperty(property.id, values, property.status)
      setIsEditing(false)
      refetch()
    } catch (caughtError) {
      if (caughtError instanceof PropertyValidationError) {
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
    if (!service || !property) {
      return
    }
    setSubmitError(null)
    setIsTogglingArchive(true)
    try {
      await service.updateProperty(
        property.id,
        toFormValues(property),
        property.status === 'archived' ? 'active' : 'archived'
      )
      refetch()
    } catch {
      setSubmitError('تغییر وضعیت بایگانی با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsTogglingArchive(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!service || !property) {
      return
    }
    setIsDeleting(true)
    try {
      await service.deleteProperty(property.id)
      navigation.goBack()
    } catch {
      setIsDeleteConfirmVisible(false)
      setSubmitError('حذف فایل با مشکل مواجه شد. دوباره تلاش کنید.')
      setIsDeleting(false)
    }
  }

  const derivedStatus =
    property && activity.deals ? derivePropertyStatus(property, activity.deals) : null
  const rentStatusLabel = property
    ? deriveRentStatusLabel(property.depositAmount, property.rentAmount)
    : null
  const headlinePrice = property
    ? moneyLine(property.price, property.depositAmount, property.rentAmount)
    : null

  return (
    <FormScreenContainer
      section="property"
      onBack={() => navigation.goBack()}
      headerTitle={isEditing ? 'ویرایش فایل ملکی' : 'جزئیات فایل ملکی'}
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
            title="بارگذاری فایل با مشکل مواجه شد"
            description={error.message}
            retryLabel="تلاش مجدد"
            onRetry={refetch}
          />
        </View>
      ) : !property ? (
        <View style={styles.centeredSection}>
          <ErrorState title="فایل پیدا نشد" />
        </View>
      ) : isEditing && values ? (
        <>
          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
          <PropertyForm values={values} errors={errors} onChange={handleChange} />
        </>
      ) : (
        <>
          <Card variant="detail">
            {/* v1.3.0 (design batch 2): deal-type tag and status, title,
                the price as a broker says it with the exact amount under
                it, then the key facts as tiles; every number in Persian. */}
            <View style={styles.tagRow}>
              {property.transactionType ? (
                <View style={styles.tag}>
                  <Text style={[theme.typography('labelSm'), styles.tagText]}>
                    {property.transactionType}
                  </Text>
                </View>
              ) : null}
              {derivedStatus ? (
                <StatusBadge label={derivedStatus.label} tone={derivedStatus.tone} />
              ) : null}
            </View>
            <MarqueeText style={[theme.typography('headlineLgMobile'), styles.title]}>
              {property.title}
            </MarqueeText>
            <Text style={[theme.typography('bodyMd'), styles.location]}>
              {[property.city, property.address].filter(Boolean).join('، ')}
            </Text>
            {/* Amin #5062: the file's photos (the main one first) */}
            <PhotoStrip subjectType="property" subjectId={property.id} />

            {headlinePrice ? (
              <View style={styles.headlineStats}>
                <Text style={[theme.typography('headlineLgMobile'), styles.priceValue]}>
                  {headlinePrice}
                </Text>
                {property.price !== null ? (
                  <Text style={[theme.typography('bodySm'), styles.exactValue]}>
                    {property.price.toLocaleString('fa-IR')} تومان
                  </Text>
                ) : null}
              </View>
            ) : null}

            <SpecTiles
              tiles={[
                property.area !== null
                  ? { label: 'متراژ', value: `${toPersianDigits(String(property.area))} متر` }
                  : null,
                property.rooms !== null
                  ? { label: 'اتاق', value: toPersianDigits(String(property.rooms)) }
                  : null,
                property.propertyType ? { label: 'نوع ملک', value: property.propertyType } : null
              ].filter((tile): tile is { label: string; value: string } => tile !== null)}
            />

            {/* v2.9.2 — reverted the v2.9.1 2-column grid back to a
                single-column table (label on the right, value on the
                left, per explicit direction) — long values like deposit
                amounts didn't fit well in a 47%-wide cell next to their
                label. */}
            {rentStatusLabel ? (
              <DetailRow
                label="وضعیت رهن/اجاره"
                value={rentStatusLabel}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.depositAmount !== null ? (
              <DetailRow
                label="میزان رهن"
                value={`${property.depositAmount.toLocaleString('fa-IR')} تومان`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.rentAmount !== null ? (
              <DetailRow
                label="میزان اجاره"
                value={`${property.rentAmount.toLocaleString('fa-IR')} تومان`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.isConvertible ? (
              <DetailRow label="قابل تبدیل" value="بله" theme={theme} styles={styles} />
            ) : null}
            {property.barterItems.length > 0 ? (
              <DetailRow
                label="مورد تهاتر"
                value={
                  property.barterItems.includes('سایر') && property.barterOtherDescription
                    ? [...property.barterItems.filter((item) => item !== 'سایر'), 'سایر'].join(
                        '، '
                      ) + `: ${property.barterOtherDescription}`
                    : property.barterItems.join('، ')
                }
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.description ? (
              <DetailRow
                label="توضیحات"
                value={property.description}
                theme={theme}
                styles={styles}
              />
            ) : null}

            {/* Amin #5066: the owner given on the new-file wizard's owner step */}
            {property.owner ? (
              <DetailRow
                label="مالک"
                value={`${property.owner.fullName} · ${toPersianDigits(
                  formatIranPhoneNumberForDisplay(property.owner.phoneNumber)
                )}`}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.owner?.notes ? (
              <DetailRow
                label="یادداشت مالک"
                value={property.owner.notes}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {canEdit ? (
              <>
                <View style={styles.actions}>
                  <Button label="ویرایش" onPress={startEditing} style={styles.actionButton} />
                  <Button
                    label={property.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی'}
                    onPress={handleToggleArchive}
                    variant="secondary"
                    loading={isTogglingArchive}
                    style={styles.actionButton}
                  />
                </View>
                <Button
                  label="حذف فایل"
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
            <SuggestedApplicantsSection
              property={property}
              onSelectApplicant={(applicantId) =>
                navigation.navigate('ApplicantDetail', { applicantId })
              }
              onDealCreated={(dealId) => navigateAcrossTabs(navigation, 'DealDetail', { dealId })}
              onViewAll={() =>
                navigateAcrossTabs(navigation, 'Matching', { propertyId: property.id })
              }
            />
          ) : null}

          <PropertyActivitySection
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
        title="حذف فایل ملکی"
        description="این فایل برای همیشه حذف می‌شود. ادامه می‌دهید؟"
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
 * v2.9.2 — a real table row (label on the reading-start side, value on
 * the reading-end side, in one row) per explicit direction, replacing
 * the earlier stacked label-above-value block. RN mirrors `flexDirection:
 * 'row'` under RTL automatically, so the label (first JSX child) lands on
 * the right and the value (second child) on the left with no isRTL
 * conditional needed here.
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
    tag: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 2,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainer
    },
    tagText: {
      color: theme.colors.onSurfaceVariant
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
    headlineStats: {
      marginTop: theme.spacing.space4,
      marginBottom: theme.spacing.space4,
      gap: 2
    },
    priceValue: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    exactValue: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    // v2.9.2 — a real table row: label (right) / value (left) in one
    // row, per explicit direction — a hairline divider between rows
    // reinforces the "table" read.
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
