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
import { PROPERTY_TRANSACTION_TYPES, PROPERTY_TYPES } from '@shared/data/realEstateOptions'
import { toPersianDigits } from '@shared/utils/persianText'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { findApplicantMatchesForProperty } from '@features/matching/services/matchingService'
import { useUndoableDelete } from '@shared/hooks/useUndoableDelete'
import { useProperties } from '../hooks/useProperties'
import { usePropertyService } from '../hooks/usePropertyService'
import { PropertyListItem } from '../components/PropertyListItem'
import type { Property, PropertyStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyList'> & {
  /**
   * v2.9.6 — this screen is also embedded directly inside `FilesScreen`
   * (the Files tab's root, below its own املاک/متقاضیان segmented
   * control), not just reached by pushing the `PropertyList` route from
   * Dashboard. A back control makes sense in the latter case (goes back
   * to Dashboard) but not the former — `FilesScreen`'s own `navigation`
   * is the Files tab's stack root, so `goBack()` there is a dead no-op.
   * `FilesScreen` passes `embedded` to suppress the header in that case.
   */
  embedded?: boolean
  /** v1.3.0: FilesScreen bumps this each time the tab comes back into view, so a file saved on another screen shows at once. */
  refreshKey?: number
}

const STATUS_OPTIONS: readonly { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'فعال' },
  { value: 'archived', label: 'بایگانی' }
]

const TRANSACTION_OPTIONS = PROPERTY_TRANSACTION_TYPES.map((type) => ({
  value: type,
  label: type
}))

const TYPE_OPTIONS = PROPERTY_TYPES.map((type) => ({ value: type, label: type }))

const BILLION = 1_000_000_000

/** v1.3.0: the filter sheet's choices; price bounds are typed in billions of toman. */
type PropertyFilters = {
  status: PropertyStatus | null
  transaction: string | null
  propertyType: string | null
  priceFrom: string
  priceTo: string
}

const NO_FILTERS: PropertyFilters = {
  status: null,
  transaction: null,
  propertyType: null,
  priceFrom: '',
  priceTo: ''
}

function matchesFilters(property: Property, filters: PropertyFilters): boolean {
  if (filters.status && property.status !== filters.status) {
    return false
  }
  if (filters.transaction && property.transactionType !== filters.transaction) {
    return false
  }
  if (filters.propertyType && property.propertyType !== filters.propertyType) {
    return false
  }
  const from = parseRangeValue(filters.priceFrom)
  const to = parseRangeValue(filters.priceTo)
  if (from !== null || to !== null) {
    if (property.price === null) {
      return false
    }
    if (from !== null && property.price < from * BILLION) {
      return false
    }
    if (to !== null && property.price > to * BILLION) {
      return false
    }
  }
  return true
}

function countFilters(filters: PropertyFilters): number {
  return (
    [filters.status, filters.transaction, filters.propertyType].filter(Boolean).length +
    (filters.priceFrom || filters.priceTo ? 1 : 0)
  )
}

export function PropertyListScreen({ navigation, embedded, refreshKey }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const ownerId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { properties, isLoading, error, refetch } = useProperties(ownerId, search)
  const propertyService = usePropertyService()
  const del = useUndoableDelete({
    noun: 'فایل ملک',
    remove: async (id) => {
      if (!propertyService) throw new Error('not ready')
      await propertyService.deleteProperty(id)
    },
    onDeleted: refetch
  })

  useEffect(() => {
    if (refreshKey) {
      refetch()
    }
  }, [refreshKey, refetch])

  // v1.3.0 (design batch 2): deal type, property type, price range and
  // status, all client-side over the already-fetched list. `draft` is
  // what the open sheet shows; `applied` is what the list uses.
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [draft, setDraft] = useState<PropertyFilters>(NO_FILTERS)
  const [applied, setApplied] = useState<PropertyFilters>(NO_FILTERS)

  // §11 of the brief — the "suitable applicants" count reuses the existing
  // matching engine (matchingService, unmodified) against the owner's
  // already-loaded applicant list: one extra query for the whole screen,
  // then cheap in-memory scoring per row — not a per-row DB query.
  const { applicants } = useApplicants(ownerId, '')
  const matchCounts = useMemo(() => {
    if (!properties || !applicants) {
      return null
    }
    const counts = new Map<string, number>()
    for (const property of properties) {
      counts.set(property.id, findApplicantMatchesForProperty(property, applicants).length)
    }
    return counts
  }, [properties, applicants])

  const filteredProperties = useMemo(
    () =>
      properties?.filter((property) => !del.hidden.has(property.id) && matchesFilters(property, applied)) ??
      properties,
    [properties, applied, del.hidden]
  )
  const draftCount = useMemo(
    () => properties?.filter((property) => matchesFilters(property, draft)).length ?? 0,
    [properties, draft]
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
    (applied.priceFrom || applied.priceTo) && {
      key: 'price',
      label: `${toPersianDigits(applied.priceFrom || '0')} تا ${toPersianDigits(applied.priceTo || '…')} میلیارد`,
      onRemove: () => setApplied((current) => ({ ...current, priceFrom: '', priceTo: '' }))
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
        <ScreenHeaderBar onBack={() => navigation.goBack()} title="فایل‌های ملکی" section="property" />
      ) : null}
      <View style={styles.content}>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="جست‌وجوی محله، خیابان، قیمت…"
          activeFilterCount={countFilters(applied)}
          onOpenFilters={openFilterSheet}
          filterLabel="فیلتر فایل‌ها"
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
              title="بارگذاری فایل‌ها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : properties && properties.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز فایلی ثبت نشده"
              description="با افزودن اولین فایل ملکی، اینجا نمایش داده می‌شود."
              actionLabel="افزودن فایل ملکی"
              onAction={() => navigation.navigate('CreateProperty')}
            />
          </View>
        ) : filteredProperties && filteredProperties.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="فایلی با این فیلتر پیدا نشد"
              description="فیلترها را تغییر دهید یا پاک کنید."
              actionLabel="پاک کردن فیلتر"
              onAction={() => setApplied(NO_FILTERS)}
            />
          </View>
        ) : (
          <FlatList
            data={filteredProperties ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={[theme.typography('bodySm'), styles.countLine]}>
                {`${toPersianDigits(String(filteredProperties?.length ?? 0))} فایل · مرتب‌شده: تازه‌ترین`}
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
              <PropertyListItem
                property={item}
                matchCount={matchCounts?.get(item.id)}
                onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
                onLongPress={() => del.onLongPress(item.id, item.title)}
              />
            )}
          />
        )}

        {properties && properties.length > 0 ? (
          <FloatingActionButton
            accessibilityLabel="افزودن فایل ملکی"
            label="فایل تازه"
            onPress={() => navigation.navigate('CreateProperty')}
          />
        ) : null}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        title="فیلتر املاک"
        hasActiveFilters={countFilters(draft) > 0}
        applyLabel={`نمایش ${toPersianDigits(String(draftCount))} فایل`}
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
          label="قیمت (میلیارد تومان)"
          from={draft.priceFrom}
          to={draft.priceTo}
          onChange={(priceFrom, priceTo) =>
            setDraft((current) => ({ ...current, priceFrom, priceTo }))
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
      // room under the last card for the floating «فایل تازه» button
      paddingBottom: 96
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
