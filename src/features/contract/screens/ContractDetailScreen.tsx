import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
  Icon,
  LoadingIndicator,
  StatusBadge
} from '@shared/components'
import { formatJalaliDate, gregorianIsoToJalali } from '@shared/utils/jalaliDate'
import { useContractDetail } from '../hooks/useContractDetail'
import { useContractService } from '../hooks/useContractService'
import { ContractForm } from '../components/ContractForm'
import { ContractStatusPicker } from '../components/ContractStatusPicker'
import { ContractValidationError } from '../validation/ContractValidationError'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES } from '../statusPresentation'
import type { Contract, ContractFormErrors, ContractFormValues, ContractStatus } from '../types'

/** How long the "وضعیت قرارداد تغییر کرد" flash stays visible — same duration as `FormScreenContainer`'s post-save flash, for one consistent feedback language across the app. */
const STATUS_FLASH_DURATION_MS = 1600

type Props = NativeStackScreenProps<MainStackParamList, 'ContractDetail'>

/** Gregorian ISO (`YYYY-MM-DD`, as stored) -> Jalali display string; falls back to the raw value if it's somehow not a well-formed date. */
function toJalaliDisplay(isoDate: string): string {
  const jalali = gregorianIsoToJalali(isoDate)
  return jalali ? formatJalaliDate(jalali) : isoDate
}

function toFormValues(contract: Contract): ContractFormValues {
  return {
    type: contract.type ?? '',
    amount: contract.amount === null ? '' : String(contract.amount),
    startDate: toJalaliDisplay(contract.startDate),
    endDate: toJalaliDisplay(contract.endDate),
    notes: contract.notes ?? '',
    trackingCode: contract.trackingCode ?? ''
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
  const [statusChanged, setStatusChanged] = useState(false)
  const [showStatusFlash, setShowStatusFlash] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)

  useEffect(() => {
    if (!statusChanged) {
      return
    }
    setShowStatusFlash(true)
    const timer = setTimeout(() => setShowStatusFlash(false), STATUS_FLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [statusChanged])

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
      setStatusChanged(true)
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
      onBack={() => navigation.goBack()}
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
      ) : isEditing && values ? (
        <>
          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
          <ContractForm values={values} errors={errors} onChange={handleChange} />
        </>
      ) : (
        // design-system.md §0.2/§17.4 — one Card for the whole record,
        // sections divided by hairlines/whitespace, never a Property
        // Card + Applicant Card + Detail Card stack.
        <Card variant="detail">
          <View style={styles.titleRow}>
            <Text style={[theme.typography('titleMd'), styles.title]}>
              {contract.type ? `قرارداد ${contract.type}` : 'قرارداد'}
            </Text>
            <StatusBadge
              label={CONTRACT_STATUS_LABELS[contract.status]}
              tone={CONTRACT_STATUS_TONES[contract.status]}
            />
          </View>

          <LinkRow
            label="ملک"
            value={contract.property?.title ?? 'ملک پیدا نشد'}
            onPress={
              contract.property
                ? () =>
                    navigateAcrossTabs(navigation, 'PropertyDetail', {
                      propertyId: contract.propertyId
                    })
                : undefined
            }
            theme={theme}
            styles={styles}
          />
          <LinkRow
            label="متقاضی"
            value={contract.applicant?.fullName ?? 'متقاضی پیدا نشد'}
            onPress={
              contract.applicant
                ? () =>
                    navigateAcrossTabs(navigation, 'ApplicantDetail', {
                      applicantId: contract.applicantId
                    })
                : undefined
            }
            theme={theme}
            styles={styles}
          />

          <View style={styles.divider} />

          <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>اطلاعات مالی</Text>
          {contract.amount !== null ? (
            <Text style={[theme.typography('headlineMd'), styles.amountValue]}>
              {contract.amount.toLocaleString('fa-IR')} تومان
            </Text>
          ) : (
            <Text style={[theme.typography('bodyMd'), styles.value]}>مبلغی ثبت نشده</Text>
          )}

          <View style={styles.divider} />

          <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>اطلاعات قرارداد</Text>
          {contract.type ? (
            <DetailRow label="نوع قرارداد" value={contract.type} theme={theme} styles={styles} />
          ) : null}
          <DetailRow
            label="بازه قرارداد"
            value={`${toJalaliDisplay(contract.startDate)} تا ${toJalaliDisplay(contract.endDate)}`}
            theme={theme}
            styles={styles}
          />
          {contract.trackingCode ? (
            <DetailRow
              label="کد رهگیری"
              value={contract.trackingCode}
              theme={theme}
              styles={styles}
            />
          ) : null}
          {contract.notes ? (
            <DetailRow label="یادداشت" value={contract.notes} theme={theme} styles={styles} />
          ) : null}

          <View style={styles.divider} />

          <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>وضعیت قرارداد</Text>
          <ContractStatusPicker
            status={contract.status}
            onChange={handleStatusChange}
            disabled={isUpdatingStatus}
          />
          {showStatusFlash ? (
            <View style={styles.statusFlash}>
              <Icon name="check" size="xs" color={theme.colors.onSuccessContainer} />
              <Text style={[theme.typography('labelMd'), styles.statusFlashLabel]}>
                وضعیت قرارداد تغییر کرد
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.actions}>
            <Button label="ویرایش" onPress={startEditing} variant="secondary" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="حذف قرارداد"
              onPress={() => setIsDeleteConfirmVisible(true)}
              style={styles.deleteAction}
            >
              <Text style={[theme.typography('labelMd'), styles.deleteActionLabel]}>
                {isDeleting ? 'در حال حذف...' : 'حذف قرارداد'}
              </Text>
            </Pressable>
          </View>

          {submitError ? (
            <Text style={[theme.typography('bodySm'), styles.submitError]}>{submitError}</Text>
          ) : null}
        </Card>
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

type LinkRowProps = {
  label: string
  value: string
  onPress?: () => void
  theme: Theme
  styles: ReturnType<typeof createStyles>
}

/** ملک/متقاضی identity row — compact, tappable through to that record's own Detail screen when it still resolves. */
function LinkRow({ label, value, onPress, theme, styles }: LinkRowProps): React.JSX.Element {
  const content = (
    <View style={styles.linkRow}>
      <View style={styles.linkTextGroup}>
        <Text style={[theme.typography('labelMd'), styles.label]}>{label}</Text>
        <Text
          style={[theme.typography('bodyMd'), styles.value]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
      </View>
      {onPress ? <Icon name="chevron" size="sm" color={theme.colors.outline} /> : null}
    </View>
  )

  if (!onPress) {
    return content
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value} onPress={onPress}>
      {content}
    </Pressable>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space4
    },
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: theme.spacing.space4
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2,
      paddingVertical: theme.spacing.space2
    },
    linkTextGroup: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    sectionLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    amountValue: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    detailRow: {
      marginBottom: theme.spacing.space3
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    value: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    statusFlash: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      gap: theme.spacing.space1,
      marginTop: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.successContainer
    },
    statusFlashLabel: {
      color: theme.colors.onSuccessContainer
    },
    // design-system.md §17.4/§7.1 — the primary action (edit) is a
    // full-weight button; the destructive action (delete) is a plain
    // text-weight affordance below it, visually de-emphasized rather
    // than stacked at equal weight in a two-button row.
    actions: {
      gap: theme.spacing.space3,
      alignItems: 'center'
    },
    deleteAction: {
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.space4
    },
    deleteActionLabel: {
      color: theme.colors.error
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    submitError: {
      color: theme.colors.error,
      marginTop: theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
