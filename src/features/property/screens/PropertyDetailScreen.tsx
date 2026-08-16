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
import { SuggestedApplicantsSection } from '@features/matching/components/SuggestedApplicantsSection'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
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
    description: property.description ?? ''
  }
}

export function PropertyDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
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

  useUnsavedChangesGuard(navigation, isEditing)

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
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !property || !values) {
      return
    }
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

  return (
    <FormScreenContainer
      onBack={() => navigation.goBack()}
      headerTitle={isEditing ? 'ویرایش فایل ملکی' : undefined}
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
            <View style={styles.titleRow}>
              <Text
                style={[theme.typography('headlineMd'), styles.title]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {property.title}
              </Text>
              {derivedStatus ? (
                <StatusBadge label={derivedStatus.label} tone={derivedStatus.tone} />
              ) : null}
            </View>
            <Text style={[theme.typography('bodyMd'), styles.location]}>
              {property.city} • {property.address}
            </Text>

            {/* design-system.md Principle 6 — price/area/rooms are what a
                broker needs first, promoted above every other detail field. */}
            <View style={styles.headlineStats}>
              {property.price !== null ? (
                <Text style={[theme.typography('headlineMd'), styles.priceValue]}>
                  {property.price.toLocaleString('fa-IR')} تومان
                </Text>
              ) : null}
              {property.area !== null || property.rooms !== null ? (
                <View style={styles.headlineMetaRow}>
                  {property.area !== null ? (
                    <Text style={[theme.typography('bodyMd'), styles.headlineMetaValue]}>
                      {property.area} متر
                    </Text>
                  ) : null}
                  {property.rooms !== null ? (
                    <Text style={[theme.typography('bodyMd'), styles.headlineMetaValue]}>
                      {property.rooms} اتاق
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {property.propertyType ? (
              <DetailRow
                label="نوع ملک"
                value={property.propertyType}
                theme={theme}
                styles={styles}
              />
            ) : null}
            {property.transactionType ? (
              <DetailRow
                label="نوع معامله"
                value={property.transactionType}
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
            {property.description ? (
              <DetailRow
                label="توضیحات"
                value={property.description}
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
                label={property.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی'}
                onPress={handleToggleArchive}
                variant="secondary"
                loading={isTogglingArchive}
                style={styles.actionButton}
              />
              <Button
                label="حذف فایل"
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
    </FormScreenContainer>
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
    // this screen: price/area/rooms, promoted above every other field.
    headlineStats: {
      marginTop: theme.spacing.space5,
      marginBottom: theme.spacing.space2,
      gap: theme.spacing.space1
    },
    priceValue: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    headlineMetaRow: {
      flexDirection: 'row',
      gap: theme.spacing.space4
    },
    headlineMetaValue: {
      color: theme.colors.onSurfaceVariant
    },
    detailRow: {
      marginTop: theme.spacing.space3
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    value: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
