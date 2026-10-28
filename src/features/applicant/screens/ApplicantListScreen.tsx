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
  type ActiveFilterChip,
  type QuickFilterChip
} from '@shared/components'
import { PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { APPLICANT_KINDS, parseApplicantKinds, type ApplicantKind } from '@shared/utils/dealKinds'
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

const TRANSACTION_OPTIONS = APPLICANT_KINDS.map((type) => ({
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
  // Amin #5368: the advanced search also narrows by city and bedrooms
  city: string | null
  rooms: string | null
}

/** Bedroom choices; «۴+» takes four or more. */
const ROOM_OPTIONS = ['1', '2', '3', '4'].map((value) => ({
  value,
  label: value === '4' ? '۴ و بیشتر' : toPersianDigits(value)
}))

const NO_FILTERS: ApplicantFilters = {
  status: null,
  transaction: null,
  propertyType: null,
  budgetFrom: '',
  budgetTo: '',
  city: null,
  rooms: null
}

/** A budget filter keeps applicants whose own budget range overlaps it. */
function matchesFilters(applicant: Applicant, filters: ApplicantFilters): boolean {
  if (filters.status && applicant.status !== filters.status) {
    return false
  }
  // Amin #5327: an applicant with several modes shows under each of them
  if (
    filters.transaction &&
    !parseApplicantKinds(applicant.preferredTransactionType).includes(
      filters.transaction as ApplicantKind
    )
  ) {
    return false
  }
  if (filters.propertyType && applicant.preferredPropertyType !== filters.propertyType) {
    return false
  }
  if (filters.city && applicant.city.trim() !== filters.city) {
    return false
  }
  if (filters.rooms) {
    if (applicant.rooms === null) {
      return false
    }
    if (filters.rooms === '4' ? applicant.rooms < 4 : applicant.rooms !== Number(filters.rooms)) {
      return false
    }
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
    [filters.status, filters.transaction, filters.propertyType, filters.city, filters.rooms].filter(
      Boolean
    ).length + (filters.budgetFrom || filters.budgetTo ? 1 : 0)
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
    onDeleted: refetch,
    blockedBy: (id) =>
      applicantService ? applicantService.deletionBlocker(id) : Promise.resolve(null)
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
      applicants?.filter(
        (applicant) => !del.hidden.has(applicant.id) && matchesFilters(applicant, applied)
      ) ?? applicants,
    [applicants, applied, del.hidden]
  )
  const cityOptions = useMemo(
    () =>
      [...new Set((applicants ?? []).map((applicant) => applicant.city.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fa'))
        .map((city) => ({ value: city, label: city })),
    [applicants]
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

  // Amin #5067: the deal type is one tap away under the search (filled while on), so it is not repeated below
  const quickFilters: QuickFilterChip[] = TRANSACTION_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
    selected: applied.transaction === option.value,
    onPress: () =>
      setApplied((current) => ({
        ...current,
        transaction: current.transaction === option.value ? null : option.value
      }))
  }))

  const chips = [
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
    applied.city && {
      key: 'city',
      label: applied.city,
      onRemove: () => setApplied((current) => ({ ...current, city: null }))
    },
    applied.rooms && {
      key: 'rooms',
      label: `${ROOM_OPTIONS.find((option) => option.value === applied.rooms)?.label ?? ''} خواب`,
      onRemove: () => setApplied((current) => ({ ...current, rooms: null }))
    },
    applied.status && {
      key: 'status',
      label: STATUS_OPTIONS.find((option) => option.value === applied.status)?.label ?? '',
      onRemove: () => setApplied((current) => ({ ...current, status: null }))
    }
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip))

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {!embedded ? (
        <ScreenHeaderBar onBack={() => navigation.goBack()} title="متقاضیان" section="applicant" />
      ) : null}
      <View style={styles.content}>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="نام، شماره، محله یا بودجه…"
          activeFilterCount={countFilters(applied)}
          onOpenFilters={openFilterSheet}
          filterLabel="فیلتر متقاضیان"
          chips={chips}
          quickFilters={quickFilters}
          onClearAll={() => setApplied(NO_FILTERS)}
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
        ) : search.trim().length > 0 && (filteredApplicants?.length ?? 0) === 0 ? (
          // Amin #5407: a search with no hits says so, never «nothing saved yet»
          <View style={styles.centeredSection}>
            <EmptyState
              title="موردی یافت نشد"
              description="عبارت دیگری بنویسید یا جست‌وجو را پاک کنید."
              actionLabel="پاک کردن جست‌وجو"
              onAction={() => setSearch('')}
            />
          </View>
        ) : applicants && applicants.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز متقاضی‌ای ثبت نشده"
              description="با دکمهٔ «متقاضی تازه» پایین صفحه اولین متقاضی را ثبت کنید."
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

        {/* Amin #5978: an empty list has only this floating button, no second create button on the page */}
        {applicants ? (
          <FloatingActionButton
            accessibilityLabel="افزودن متقاضی"
            label="متقاضی تازه"
            onPress={() => navigation.navigate('CreateApplicant')}
          />
        ) : null}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        title="جست‌وجوی پیشرفته"
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
        {cityOptions.length > 1 ? (
          <ChipGroup
            label="شهر"
            options={cityOptions}
            value={draft.city}
            onChange={(city) => setDraft((current) => ({ ...current, city }))}
          />
        ) : null}
        <ChipGroup
          label="تعداد خواب"
          options={ROOM_OPTIONS}
          value={draft.rooms}
          onChange={(rooms) => setDraft((current) => ({ ...current, rooms }))}
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
