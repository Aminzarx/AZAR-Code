import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  ChipGroup,
  EmptyState,
  ErrorState,
  FilterSheet,
  FloatingActionButton,
  Icon,
  LoadingIndicator,
  TextInput
} from '@shared/components'
import { APPLICANT_TRANSACTION_TYPES } from '@shared/data/realEstateOptions'
import { useApplicants } from '../hooks/useApplicants'
import { ApplicantListItem } from '../components/ApplicantListItem'
import type { Applicant, ApplicantStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ApplicantList'>

const STATUS_OPTIONS: readonly { value: ApplicantStatus; label: string }[] = [
  { value: 'active', label: 'فعال' },
  { value: 'archived', label: 'غیرفعال' }
]

const TRANSACTION_OPTIONS = APPLICANT_TRANSACTION_TYPES.map((type) => ({
  value: type,
  label: type
}))

export function ApplicantListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { applicants, isLoading, error, refetch } = useApplicants(userId, search)

  // §12 of the brief, scoped down — two cheap client-side filters over the
  // already-fetched list (status, preferred transaction type), not a new
  // server-side filter query for every field. See the delivery report for
  // the full scope-down rationale.
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ApplicantStatus | null>(null)
  const [transactionFilter, setTransactionFilter] = useState<string | null>(null)
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<ApplicantStatus | null>(null)
  const [appliedTransactionFilter, setAppliedTransactionFilter] = useState<string | null>(null)
  const hasActiveFilters = appliedStatusFilter !== null || appliedTransactionFilter !== null

  const filteredApplicants = useMemo(() => {
    if (!applicants) {
      return applicants
    }
    return applicants.filter((applicant: Applicant) => {
      if (appliedStatusFilter && applicant.status !== appliedStatusFilter) {
        return false
      }
      if (
        appliedTransactionFilter &&
        applicant.preferredTransactionType !== appliedTransactionFilter
      ) {
        return false
      }
      return true
    })
  }, [applicants, appliedStatusFilter, appliedTransactionFilter])

  function openFilterSheet(): void {
    setStatusFilter(appliedStatusFilter)
    setTransactionFilter(appliedTransactionFilter)
    setIsFilterVisible(true)
  }

  function applyFilters(): void {
    setAppliedStatusFilter(statusFilter)
    setAppliedTransactionFilter(transactionFilter)
    setIsFilterVisible(false)
  }

  function clearFilters(): void {
    setStatusFilter(null)
    setTransactionFilter(null)
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <TextInput
              label="جستجو"
              value={search}
              onChangeText={setSearch}
              placeholder="نام، شهر، شماره تماس یا بودجه"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فیلتر متقاضیان"
            onPress={openFilterSheet}
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          >
            <Icon
              name="filter"
              size="sm"
              color={hasActiveFilters ? theme.colors.onPrimaryContainer : theme.colors.onSurface}
            />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری متقاضیان با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : applicants && applicants.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز متقاضی‌ای ثبت نشده"
              description="با افزودن اولین متقاضی، اینجا نمایش داده می‌شود."
              actionLabel="افزودن متقاضی"
              onAction={() => navigation.navigate('CreateApplicant')}
            />
          </View>
        ) : filteredApplicants && filteredApplicants.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="متقاضی‌ای با این فیلتر پیدا نشد"
              description="فیلترها را تغییر دهید یا پاک کنید."
              actionLabel="پاک کردن فیلتر"
              onAction={clearFilters}
            />
          </View>
        ) : (
          <FlatList
            data={filteredApplicants ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <ApplicantListItem
                applicant={item}
                onPress={() => navigation.navigate('ApplicantDetail', { applicantId: item.id })}
              />
            )}
          />
        )}

        {applicants && applicants.length > 0 ? (
          <FloatingActionButton
            accessibilityLabel="افزودن متقاضی"
            onPress={() => navigation.navigate('CreateApplicant')}
          />
        ) : null}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        title="فیلتر متقاضیان"
        hasActiveFilters={statusFilter !== null || transactionFilter !== null}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={() => setIsFilterVisible(false)}
      >
        <ChipGroup
          label="وضعیت"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <ChipGroup
          label="نوع معامله مدنظر"
          options={TRANSACTION_OPTIONS}
          value={transactionFilter}
          onChange={setTransactionFilter}
        />
      </FilterSheet>
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
      flex: 1,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.space2
    },
    searchField: {
      flex: 1
    },
    filterButton: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center'
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primaryContainer
    },
    list: {
      gap: theme.spacing.space3
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
