import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { FormScreenContainer } from '@shared/components'
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
    <FormScreenContainer headerTitle="افزودن قرارداد" onSave={handleSubmit} isSaving={isSubmitting}>
      {submitError ? (
        <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
      ) : null}
      <ContractForm values={values} errors={errors} onChange={handleChange} />
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
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
