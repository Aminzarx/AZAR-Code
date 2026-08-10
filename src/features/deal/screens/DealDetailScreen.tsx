import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, ErrorState, LoadingIndicator, TextInput } from '@shared/components'
import { useDealDetail } from '../hooks/useDealDetail'
import { useDealService } from '../hooks/useDealService'
import { DealStatusPicker } from '../components/DealStatusPicker'
import type { DealStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'DealDetail'>

export function DealDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { dealId } = route.params
  const { deal, isLoading, error, refetch } = useDealDetail(dealId)
  const service = useDealService()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setNotes(deal?.notes ?? '')
  }, [deal?.notes])

  async function handleStatusChange(status: DealStatus): Promise<void> {
    if (!service || !deal) {
      return
    }
    setActionError(null)
    setIsUpdatingStatus(true)
    try {
      await service.updateStatus(deal.id, status)
      refetch()
    } catch {
      setActionError('تغییر وضعیت با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  async function handleSaveNotes(): Promise<void> {
    if (!service || !deal) {
      return
    }
    setActionError(null)
    setIsSavingNotes(true)
    try {
      await service.updateNotes(deal.id, notes)
      refetch()
    } catch {
      setActionError('ذخیره یادداشت با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری پیگیری با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : !deal ? (
          <View style={styles.centeredSection}>
            <ErrorState title="پیگیری پیدا نشد" />
          </View>
        ) : (
          <>
            <Card variant="detail">
              <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>ملک</Text>
              <Text style={[theme.typography('bodyMd'), styles.value]}>
                {deal.property?.title ?? 'ملک پیدا نشد'}
              </Text>
              {deal.property ? (
                <Text style={[theme.typography('bodySm'), styles.subValue]}>
                  {deal.property.city} • {deal.property.address}
                </Text>
              ) : null}
            </Card>

            <Card variant="detail">
              <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>متقاضی</Text>
              <Text style={[theme.typography('bodyMd'), styles.value]}>
                {deal.applicant?.fullName ?? 'متقاضی پیدا نشد'}
              </Text>
              {deal.applicant ? (
                <Text style={[theme.typography('bodySm'), styles.subValue]}>
                  {deal.applicant.city} • {deal.applicant.phoneNumber}
                </Text>
              ) : null}
            </Card>

            <View style={styles.section}>
              <Text style={[theme.typography('titleSm'), styles.sectionLabel]}>وضعیت</Text>
              <DealStatusPicker
                status={deal.status}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
              />
            </View>

            <View style={styles.section}>
              <TextInput
                label="یادداشت"
                value={notes}
                onChangeText={setNotes}
                placeholder="یادداشت‌های این پیگیری"
              />
              <Button
                label="ذخیره یادداشت"
                onPress={handleSaveNotes}
                variant="secondary"
                loading={isSavingNotes}
              />
            </View>

            {actionError ? (
              <Text style={[theme.typography('bodySm'), styles.actionError]}>{actionError}</Text>
            ) : null}

            <Button
              label="افزودن یادآوری"
              variant="secondary"
              onPress={() =>
                navigation.navigate('CreateReminder', {
                  dealId: deal.id,
                  propertyId: deal.propertyId,
                  applicantId: deal.applicantId
                })
              }
            />

            <Button
              label="ایجاد قرارداد"
              variant="secondary"
              onPress={() =>
                navigation.navigate('CreateContract', {
                  dealId: deal.id,
                  propertyId: deal.propertyId,
                  applicantId: deal.applicantId
                })
              }
              style={styles.createContractButton}
            />
          </>
        )}
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
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    },
    sectionLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.space1
    },
    value: {
      color: theme.colors.onSurface
    },
    subValue: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    section: {
      gap: theme.spacing.space3
    },
    actionError: {
      color: theme.colors.error
    },
    createContractButton: {
      marginTop: theme.spacing.space3
    }
  })
}
