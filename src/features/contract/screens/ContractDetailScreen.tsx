import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FormScreenContainer,
  LoadingIndicator
} from '@shared/components'
import { useContractDetail } from '../hooks/useContractDetail'
import { useContractService } from '../hooks/useContractService'
import { ContractForm } from '../components/ContractForm'
import { ContractStatusPicker } from '../components/ContractStatusPicker'
import { ContractValidationError } from '../validation/ContractValidationError'
import type { Contract, ContractFormErrors, ContractFormValues, ContractStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ContractDetail'>

function toFormValues(contract: Contract): ContractFormValues {
  return {
    type: contract.type ?? '',
    amount: contract.amount === null ? '' : String(contract.amount),
    startDate: contract.startDate,
    endDate: contract.endDate,
    notes: contract.notes ?? ''
  }
}

export function ContractDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { contractId } = route.params
  const { contract, isLoading, error, refetch } = useContractDetail(contractId)
  const service = useContractService()
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ContractFormValues | null>(null)
  const [errors, setErrors] = useState<ContractFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)

  function startEditing(): void {
    if (!contract) {
      return
    }
    setValues(toFormValues(contract))
    setErrors({})
    setSubmitError(null)
    setIsEditing(true)
  }

  function handleChange<K extends keyof ContractFormValues>(
    field: K,
    value: ContractFormValues[K]
  ): void {
    setValues((current) => (current ? { ...current, [field]: value } : current))
  }

  async function handleSubmit(): Promise<void> {
    if (!service || !contract || !values) {
      return
    }
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await service.updateContract(contract.id, values, contract.status)
      setIsEditing(false)
      refetch()
    } catch (caughtError) {
      if (caughtError instanceof ContractValidationError) {
        setErrors(caughtError.fieldErrors)
      } else {
        setSubmitError('ذخیره تغییرات با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleStatusChange(status: ContractStatus): Promise<void> {
    if (!service || !contract) {
      return
    }
    setSubmitError(null)
    setIsUpdatingStatus(true)
    try {
      await service.updateContract(contract.id, toFormValues(contract), status)
      refetch()
    } catch {
      setSubmitError('تغییر وضعیت با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!service || !contract) {
      return
    }
    setIsDeleting(true)
    try {
      await service.deleteContract(contract.id)
      navigation.goBack()
    } catch {
      setIsDeleteConfirmVisible(false)
      setSubmitError('حذف قرارداد با مشکل مواجه شد. دوباره تلاش کنید.')
      setIsDeleting(false)
    }
  }

  return (
    <FormScreenContainer
      headerTitle={isEditing ? 'ویرایش قرارداد' : undefined}
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
            title="بارگذاری قرارداد با مشکل مواجه شد"
            description={error.message}
            retryLabel="تلاش مجدد"
            onRetry={refetch}
          />
        </View>
      ) : !contract ? (
        <View style={styles.centeredSection}>
          <ErrorState title="قرارداد پیدا نشد" />
        </View>
      ) : (
        <>
          <Card variant="detail">
            <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>ملک</Text>
            <Text style={[theme.typography('bodyMd'), styles.value]}>
              {contract.property?.title ?? 'ملک پیدا نشد'}
            </Text>
            {contract.property ? (
              <Text style={[theme.typography('bodySm'), styles.subValue]}>
                {contract.property.city} • {contract.property.address}
              </Text>
            ) : null}
          </Card>

          <Card variant="detail">
            <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>متقاضی</Text>
            <Text style={[theme.typography('bodyMd'), styles.value]}>
              {contract.applicant?.fullName ?? 'متقاضی پیدا نشد'}
            </Text>
            {contract.applicant ? (
              <Text style={[theme.typography('bodySm'), styles.subValue]}>
                {contract.applicant.city} • {contract.applicant.phoneNumber}
              </Text>
            ) : null}
          </Card>

          <View style={styles.section}>
            <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>وضعیت</Text>
            <ContractStatusPicker
              status={contract.status}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
            />
          </View>

          {isEditing && values ? (
            <View style={styles.section}>
              <ContractForm
                values={values}
                errors={errors}
                onChange={handleChange}
                onSubmit={handleSubmit}
                submitLabel="ذخیره تغییرات"
                isSubmitting={isSubmitting}
              />
            </View>
          ) : (
            <Card variant="detail">
              {contract.type ? (
                <DetailRow
                  label="نوع قرارداد"
                  value={contract.type}
                  theme={theme}
                  styles={styles}
                />
              ) : null}
              {contract.amount !== null ? (
                <DetailRow
                  label="مبلغ"
                  value={`${contract.amount.toLocaleString('fa-IR')} تومان`}
                  theme={theme}
                  styles={styles}
                />
              ) : null}
              <DetailRow
                label="بازه قرارداد"
                value={`${contract.startDate} تا ${contract.endDate}`}
                theme={theme}
                styles={styles}
              />
              {contract.notes ? (
                <DetailRow label="یادداشت" value={contract.notes} theme={theme} styles={styles} />
              ) : null}
              <Button
                label="ویرایش"
                onPress={startEditing}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                label="حذف قرارداد"
                onPress={() => setIsDeleteConfirmVisible(true)}
                variant="destructive"
                loading={isDeleting}
                style={styles.actionButton}
              />
            </Card>
          )}

          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
        </>
      )}

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="حذف قرارداد"
        description="این قرارداد برای همیشه حذف می‌شود. ادامه می‌دهید؟"
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
    sectionLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.space1
    },
    section: {
      gap: theme.spacing.space3
    },
    detailRow: {
      marginBottom: theme.spacing.space3
    },
    label: {
      color: theme.colors.onSurfaceVariant
    },
    value: {
      color: theme.colors.onSurface
    },
    subValue: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    submitError: {
      color: theme.colors.error
    },
    actionButton: {
      marginTop: theme.spacing.space3
    }
  })
}
