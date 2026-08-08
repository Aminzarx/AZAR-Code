import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
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

  function handleChange<K extends keyof PropertyFormValues>(
    field: K,
    value: PropertyFormValues[K]
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
      const property = await service.createProperty(session.userId, values)
      navigation.replace('PropertyDetail', { propertyId: property.id })
    } catch (caughtError) {
      if (caughtError instanceof PropertyValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ثبت پرونده با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[theme.typography('titleMd'), styles.heading]}>افزودن پرونده ملکی</Text>
        {submitError ? (
          <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
        ) : null}
        <PropertyForm
          values={values}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitLabel="ثبت پرونده"
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
