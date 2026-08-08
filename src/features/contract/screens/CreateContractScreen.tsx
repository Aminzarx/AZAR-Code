import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { useContractService } from '../hooks/useContractService'
import { ContractForm } from '../components/ContractForm'
import { ContractValidationError } from '../validation/ContractValidationError'
import type { ContractFormErrors, ContractFormValues } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateContract'>

const EMPTY_VALUES: ContractFormValues = {
  type: '',
  amount: '',
  startDate: '',
  endDate: '',
  notes: ''
}

export function CreateContractScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const service = useContractService()
  const { propertyId, applicantId, dealId } = route.params
  const [values, setValues] = useState<ContractFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<ContractFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange<K extends keyof ContractFormValues>(
    field: K,
    value: ContractFormValues[K]
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
      const contract = await service.createContract(
        session.userId,
        { propertyId, applicantId, dealId },
        values
      )
      navigation.replace('ContractDetail', { contractId: contract.id })
    } catch (caughtError) {
      if (caughtError instanceof ContractValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ثبت قرارداد با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[theme.typography('titleMd'), styles.heading]}>افزودن قرارداد</Text>
        {submitError ? (
          <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
        ) : null}
        <ContractForm
          values={values}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitLabel="ثبت قرارداد"
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
