import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
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
  ListToolbar,
  LoadingIndicator,
  RangeFilter,
  ScreenHeaderBar,
  parseRangeValue,
  type ActiveFilterChip
} from '@shared/components'
import { APPLICANT_TRANSACTION_TYPES, PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { toPersianDigits } from '@shared/utils/persianText'
import { useProperties } from '@features/property/hooks/useProperties'
import { findPropertyMatchesForApplicant } from '@features/matching/services/matchingService'
import { useUndoableDelete } from '@shared/hooks/useUndoableDelete'
import { useApplicants } from '../hooks/useApplicants'
import { useApplicantService } from '../hooks/useApplicantService'
import { ApplicantListItem } from '../components/ApplicantListItem'
import type { Applicant, ApplicantStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ApplicantList'> & {
  /** See PropertyListScreen's identical `embedded` prop for why. */
  embedded?: boolean
  /** v1.3.0: FilesScreen bumps this each time the tab comes back into view, so a file saved on another screen shows at once. */
  refreshKey?: number
}

const STATUS_OPTIONS: readonly { value: ApplicantStatus; label: string }[] = [
  { value: 'active', label: 'فعال' },
  { value: 'archived', label: 'غیرفعال' }
]

const TRANSACTION_OPTIONS = APPLICANT_TRANSACTION_TYPES.map((type) => ({
  value: type,
  label: type
}))

const TYPE_OPTIONS = PROPERTY_TYPES.map((type) => ({ value: type, label: type }))

const BILLION = 1_000_000_000

/** v1.3.0: the filter sheet's choices; the budget is typed in billions of toman. */
type ApplicantFilters = {
  status: ApplicantStatus | null
  transaction: string | null
  propertyType: string | null
  budgetFrom: string
  budgetTo: string
}

const NO_FILTERS: ApplicantFilters = {
  status: null,
  transaction: null,
  propertyType: null,
  budgetFrom: '',
  budgetTo: ''
}

/** A budget filter keeps applicants whose own budget range overlaps it. */
function matchesFilters(applicant: Applicant, filters: ApplicantFilters): boolean {
  if (filters.status && applicant.status !== filters.status) {
    return false
  }
  if (filters.transaction && applicant.preferredTransactionType !== filters.transaction) {
    return false
  }
  if (filters.propertyType && applicant.preferredPropertyType !== filters.propertyType) {
    return false
  }
  const from = parseRangeValue(filters.budgetFrom)
  const to = parseRangeValue(filters.budgetTo)
  if (from !== null || to !== null) {
    if (applicant.minBudget === null && applicant.maxBudget === null) {
      return false
    }
    const low = applicant.minBudget ?? applicant.maxBudget ?? 0
    const high = applicant.maxBudget ?? applicant.minBudget ?? 0
    if (from !== null && high < from * BILLION) {
      return false
    }
    if (to !== null && low > to * BILLION) {
      return false
    }
  }
  return true
}

function countFilters(filters: ApplicantFilters): number {
  return (
    [filters.status, filters.transaction, filters.propertyType].filter(Boolean).length +
    (filters.budgetFrom || filters.budgetTo ? 1 : 0)
  )
}

export function ApplicantListScreen({
  navigation,
  embedded,
  refreshKey
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { applicants, isLoading, error, refetch } = useApplicants(userId, search)
  const applicantService = useApplicantService()
  const del = useUndoableDelete({
    noun: 'متقاضی',
    remove: async (id) => {
      if (!applicantService) throw new Error('not ready')
      await applicantService.deleteApplicant(id)
    },
    onDeleted: refetch
  })

  useEffect(() => {
    if (refreshKey) {
      refetch()
    }
  }, [refreshKey, refetch])

  // v1.3.0 (design batch 2): same client-side filter model as the
  // property list — `draft` in the open sheet, `applied` on the list.
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [draft, setDraft] = useState<ApplicantFilters>(NO_FILTERS)
  const [applied, setApplied] = useState<ApplicantFilters>(NO_FILTERS)

  // «۳ فایل مناسب» per card: the matching engine over the already-loaded
  // property list, once for the whole screen.
  const { properties } = useProperties(userId, '')
  const matchCounts = useMemo(() => {
    if (!properties || !applicants) {
      return null
    }
    const active = properties.filter((property) => property.status === 'active')
    const counts = new Map<string, number>()
    for (const applicant of applicants) {
      counts.set(applicant.id, findPropertyMatchesForApplicant(applicant, active).length)
    }
    return counts
  }, [properties, applicants])

  const filteredApplicants = useMemo(
    () =>
      applicants?.filter((applicant) => !del.hidden.has(applicant.id) && matchesFilters(applicant, applied)) ??
      applicants,
    [applicants, applied, del.hidden]
  )
  const draftCount = useMemo(
    () => applicants?.filter((applicant) => matchesFilters(applicant, draft)).length ?? 0,
    [applicants, draft]
  )

  function openFilterSheet(): void {
    setDraft(applied)
    setIsFilterVisible(true)
  }

  function applyFilters(): void {
    setApplied(draft)
    setIsFilterVisible(false)
  }

  const chips = [
    applied.transaction && {
      key: 'transaction',
      label: applied.transaction,
      onRemove: () => setApplied((current) => ({ ...current, transaction: null }))
    },
    applied.propertyType && {
      key: 'propertyType',
      label: applied.propertyType,
      onRemove: () => setApplied((current) => ({ ...current, propertyType: null }))
    },
    (applied.budgetFrom || applied.budgetTo) && {
      key: 'budget',
      label: `بودجه ${toPersianDigits(applied.budgetFrom || '0')} تا ${toPersianDigits(applied.budgetTo || '…')} میلیارد`,
      onRemove: () => setApplied((current) => ({ ...current, budgetFrom: '', budgetTo: '' }))
    },
    applied.status && {
      key: 'status',
      label: STATUS_OPTIONS.find((option) => option.value === applied.status)?.label ?? '',
      onRemove: () => setApplied((current) => ({ ...current, status: null }))
    }
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip))

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {!embedded ? <ScreenHeaderBar onBack={() => navigation.goBack()} title="متقاضیان" section="applicant" /> : null}
      <View style={styles.content}>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="نام، شماره، محله یا بودجه…"
          activeFilterCount={countFilters(applied)}
          onOpenFilters={openFilterSheet}
          filterLabel="فیلتر متقاضیان"
          chips={chips}
        />

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
              onAction={() => setApplied(NO_FILTERS)}
            />
          </View>
        ) : (
          <FlatList
            data={filteredApplicants ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={[theme.typography('bodySm'), styles.countLine]}>
                {`${toPersianDigits(String(filteredApplicants?.length ?? 0))} متقاضی · مرتب‌شده: تازه‌ترین`}
              </Text>
            }
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
                matchCount={matchCounts?.get(item.id)}
                onPress={() => navigation.navigate('ApplicantDetail', { applicantId: item.id })}
                onLongPress={() => del.onLongPress(item.id, item.fullName)}
              />
            )}
          />
        )}

        {applicants && applicants.length > 0 ? (
          <FloatingActionButton
            accessibilityLabel="افزودن متقاضی"
            label="متقاضی تازه"
            onPress={() => navigation.navigate('CreateApplicant')}
          />
        ) : null}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        title="فیلتر متقاضیان"
        hasActiveFilters={countFilters(draft) > 0}
        applyLabel={`نمایش ${toPersianDigits(String(draftCount))} متقاضی`}
        onApply={applyFilters}
        onClear={() => setDraft(NO_FILTERS)}
        onClose={() => setIsFilterVisible(false)}
      >
        <ChipGroup
          label="نوع معامله"
          options={TRANSACTION_OPTIONS}
          value={draft.transaction}
          onChange={(transaction) => setDraft((current) => ({ ...current, transaction }))}
        />
        <ChipGroup
          label="نوع ملک"
          options={TYPE_OPTIONS}
          value={draft.propertyType}
          onChange={(propertyType) => setDraft((current) => ({ ...current, propertyType }))}
        />
        <RangeFilter
          label="بودجه (میلیارد تومان)"
          from={draft.budgetFrom}
          to={draft.budgetTo}
          onChange={(budgetFrom, budgetTo) =>
            setDraft((current) => ({ ...current, budgetFrom, budgetTo }))
          }
        />
        <ChipGroup
          label="وضعیت"
          options={STATUS_OPTIONS}
          value={draft.status}
          onChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
      </FilterSheet>
      {del.ui}
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
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space4,
      gap: theme.spacing.space3
    },
    countLine: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginBottom: theme.spacing.space1
    },
    list: {
      gap: theme.spacing.space3,
      // room under the last card for the floating «متقاضی تازه» button
      paddingBottom: 96
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
