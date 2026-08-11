import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { FormScreenContainer } from '@shared/components'
import { useUnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import { usePropertyService } from '../hooks/usePropertyService'
import { PropertyForm } from '../components/PropertyForm'
import { PropertyValidationError } from '../services/PropertyValidationError'
import type { PropertyFormErrors, PropertyFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateProperty'>

const EMPTY_VALUES: PropertyFormValues = {
  title: '',
  propertyType: '',
  transactionType: '',
  city: '',
  address: '',
  price: '',
  area: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  description: ''
}

export function CreatePropertyScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = usePropertyService()
  const [values, setValues] = useState<PropertyFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<PropertyFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChangesGuard(navigation, isDirty)

  function handleChange<K extends keyof PropertyFormValues>(
    field: K,
    value: PropertyFormValues[K]
  ): void {
    setValues((current) => ({ ...current, [field]: value }))
    setIsDirty(true)
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !session) {
      return
    }
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const property = await service.createProperty(session.userId, values)
      setIsDirty(false)
      navigation.replace('PropertyDetail', { propertyId: property.id })
    } catch (caughtError) {
      if (caughtError instanceof PropertyValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ثبت فایل با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormScreenContainer
      headerTitle="افزودن فایل ملکی"
      onSave={handleSubmit}
      isSaving={isSubmitting}
    >
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      <PropertyForm values={values} errors={errors} onChange={handleChange} />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    submitError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
