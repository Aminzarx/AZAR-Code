import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
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
  Icon,
  LoadingIndicator,
  TextInput
} from '@shared/components'
import { PROPERTY_TRANSACTION_TYPES } from '@shared/data/realEstateOptions'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { findApplicantMatchesForProperty } from '@features/matching/services/matchingService'
import { useProperties } from '../hooks/useProperties'
import { PropertyListItem } from '../components/PropertyListItem'
import type { Property, PropertyStatus } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyList'>

const STATUS_OPTIONS: readonly { value: PropertyStatus; label: string }[] = [
  { value: 'active', label: 'فعال' },
  { value: 'archived', label: 'بایگانی' }
]

const TRANSACTION_OPTIONS = PROPERTY_TRANSACTION_TYPES.map((type) => ({
  value: type,
  label: type
}))

export function PropertyListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const ownerId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { properties, isLoading, error, refetch } = useProperties(ownerId, search)

  // §12 of the brief, scoped down — two cheap client-side filters over the
  // already-fetched list (status, transaction type), not a new server-side
  // filter query for every field. See the delivery report for the full
  // scope-down rationale.
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | null>(null)
  const [transactionFilter, setTransactionFilter] = useState<string | null>(null)
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<PropertyStatus | null>(null)
  const [appliedTransactionFilter, setAppliedTransactionFilter] = useState<string | null>(null)
  const hasActiveFilters = appliedStatusFilter !== null || appliedTransactionFilter !== null

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

  const filteredProperties = useMemo(() => {
    if (!properties) {
      return properties
    }
    return properties.filter((property: Property) => {
      if (appliedStatusFilter && property.status !== appliedStatusFilter) {
        return false
      }
      if (appliedTransactionFilter && property.transactionType !== appliedTransactionFilter) {
        return false
      }
      return true
    })
  }, [properties, appliedStatusFilter, appliedTransactionFilter])

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <TextInput
              label="جستجو"
              value={search}
              onChangeText={setSearch}
              placeholder="عنوان، شهر، آدرس یا قیمت"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فیلتر فایل‌ها"
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
              onAction={clearFilters}
            />
          </View>
        ) : (
          <FlatList
            data={filteredProperties ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PropertyListItem
                property={item}
                matchCount={matchCounts?.get(item.id)}
                onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
              />
            )}
          />
        )}
      </View>

      <FilterSheet
        visible={isFilterVisible}
        title="فیلتر فایل‌های ملکی"
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
          label="نوع معامله"
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
