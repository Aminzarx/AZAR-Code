import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, ErrorState, FormScreenContainer, LoadingIndicator } from '@shared/components'
import { SuggestedApplicantsSection } from '@features/matching/components/SuggestedApplicantsSection'
import { usePropertyDetail } from '../hooks/usePropertyDetail'
import { usePropertyService } from '../hooks/usePropertyService'
import { PropertyForm } from '../components/PropertyForm'
import { PropertyValidationError } from '../services/PropertyValidationError'
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
    description: property.description ?? ''
  }
}

export function PropertyDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { propertyId } = route.params
  const { property, isLoading, error, refetch } = usePropertyDetail(propertyId)
  const service = usePropertyService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<PropertyFormValues | null>(null)
  const [errors, setErrors] = useState<PropertyFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  return (
    <FormScreenContainer
      headerTitle={isEditing ? 'ویرایش پرونده ملکی' : undefined}
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
            title="بارگذاری پرونده با مشکل مواجه شد"
            description={error.message}
            retryLabel="تلاش مجدد"
            onRetry={refetch}
          />
        </View>
      ) : !property ? (
        <View style={styles.centeredSection}>
          <ErrorState title="پرونده پیدا نشد" />
        </View>
      ) : isEditing && values ? (
        <>
          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
          <PropertyForm
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
          <Text style={[theme.typography('headlineMd'), styles.title]}>{property.title}</Text>
          <View style={styles.detailRow}>
            <Text style={[theme.typography('bodyMd'), styles.value]}>
              {property.city} • {property.address}
            </Text>
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
          {property.price !== null ? (
            <DetailRow
              label="قیمت"
              value={`${property.price.toLocaleString('fa-IR')} تومان`}
              theme={theme}
              styles={styles}
            />
          ) : null}
          {property.area !== null ? (
            <DetailRow label="متراژ" value={`${property.area} متر`} theme={theme} styles={styles} />
          ) : null}
          {property.rooms !== null ? (
            <DetailRow
              label="تعداد اتاق"
              value={String(property.rooms)}
              theme={theme}
              styles={styles}
            />
          ) : null}
          {property.description ? (
            <DetailRow label="توضیحات" value={property.description} theme={theme} styles={styles} />
          ) : null}
          <Button
            label="ویرایش"
            onPress={startEditing}
            variant="secondary"
            style={styles.editButton}
          />
        </Card>
      )}

      {property && !isEditing ? (
        <SuggestedApplicantsSection
          property={property}
          onSelectApplicant={(applicantId) =>
            navigation.navigate('ApplicantDetail', { applicantId })
          }
          onDealCreated={(dealId) => navigation.navigate('DealDetail', { dealId })}
        />
      ) : null}
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
    }
  })
}
