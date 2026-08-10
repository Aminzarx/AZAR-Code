import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  EmptyState,
  ErrorState,
  LoadingIndicator,
  SegmentedControl,
  TextInput
} from '@shared/components'
import { useContracts } from '../hooks/useContracts'
import { ContractListItem } from '../components/ContractListItem'
import { CONTRACT_STATUS_LABELS } from '../statusPresentation'
import type { ContractStatus, ContractWithDetails } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ContractList'>

type StatusFilter = ContractStatus | 'all'

const STATUS_FILTER_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'active', label: CONTRACT_STATUS_LABELS.active },
  { value: 'completed', label: CONTRACT_STATUS_LABELS.completed },
  { value: 'cancelled', label: CONTRACT_STATUS_LABELS.cancelled }
]

function matchesSearch(contract: ContractWithDetails, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  const haystack = [contract.property?.title, contract.applicant?.fullName, contract.type]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
  return haystack.includes(normalized)
}

export function ContractListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { contracts, isLoading, error, refetch } = useContracts(userId)

  // §16/§20 of the brief — search was removed from the current spec but
  // the affordance stays ready to add back without a redesign: the icon
  // reveals a field that filters the already-loaded list client-side,
  // not a permanently-occupied search bar (§0.2's UI-overload ban), and
  // not a new server-side query (`useContracts` is unchanged).
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredContracts = useMemo(() => {
    if (!contracts) {
      return contracts
    }
    return contracts.filter(
      (contract) =>
        (statusFilter === 'all' || contract.status === statusFilter) &&
        matchesSearch(contract, search)
    )
  }, [contracts, statusFilter, search])

  function toggleSearch(): void {
    setIsSearchVisible((current) => {
      if (current) {
        setSearch('')
      }
      return !current
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.toolbarRow}>
          <View style={styles.segmentField}>
            <SegmentedControl
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="جستجو در قراردادها"
            accessibilityState={{ selected: isSearchVisible }}
            onPress={toggleSearch}
            style={[styles.searchToggle, isSearchVisible && styles.searchToggleActive]}
          >
            <Text
              style={[
                theme.typography('titleSm'),
                isSearchVisible ? styles.searchGlyphActive : styles.searchGlyph
              ]}
            >
              ⌕
            </Text>
          </Pressable>
        </View>

        {isSearchVisible ? (
          <TextInput
            label="جستجو در قراردادها"
            value={search}
            onChangeText={setSearch}
            placeholder="ملک، متقاضی یا نوع قرارداد"
          />
        ) : null}

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری قراردادها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : contracts && contracts.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز قراردادی ثبت نشده"
              description="قراردادها را از صفحه پیگیری ایجاد کنید."
              actionLabel="مشاهده پیگیری‌ها"
              onAction={() => navigateAcrossTabs(navigation, 'DealList', undefined)}
            />
          </View>
        ) : filteredContracts && filteredContracts.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="قراردادی با این فیلتر پیدا نشد"
              description="فیلتر وضعیت یا عبارت جستجو را تغییر دهید."
              actionLabel="پاک کردن فیلتر"
              onAction={() => {
                setStatusFilter('all')
                setSearch('')
              }}
            />
          </View>
        ) : (
          <FlatList
            data={filteredContracts ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ContractListItem
                contract={item}
                onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}
              />
            )}
          />
        )}
      </View>
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
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    segmentField: {
      flex: 1
    },
    searchToggle: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center'
    },
    searchToggleActive: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primaryContainer
    },
    searchGlyph: {
      color: theme.colors.onSurface
    },
    searchGlyphActive: {
      color: theme.colors.onPrimaryContainer
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
