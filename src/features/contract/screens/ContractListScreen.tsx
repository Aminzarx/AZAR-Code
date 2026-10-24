import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
// Amin #5046: the gesture-handler ScrollView, so sliding the filter chips wins over the swipe between tabs
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  EmptyState,
  ErrorState,
  FloatingActionButton,
  Icon,
  LoadingIndicator,
  TextInput
} from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatJalaliDate, gregorianIsoToJalali } from '@shared/utils/jalaliDate'
import { useUndoableDelete } from '@shared/hooks/useUndoableDelete'
import { useContracts } from '../hooks/useContracts'
import { useContractService } from '../hooks/useContractService'
import { ContractListItem, ENDING_SOON_DAYS, isEndingSoon } from '../components/ContractListItem'
import { CONTRACT_STATUS_LABELS } from '../statusPresentation'
import type { ContractWithDetails } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ContractList'>

// v1.4.0 (approved «قراردادها» design): فعال · رو به پایان · تمام‌شده,
// each with its count; «همه» stays at the end for the full list.
type StatusFilter = 'active' | 'endingSoon' | 'ended' | 'all'

const STATUS_FILTER_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'active', label: CONTRACT_STATUS_LABELS.active },
  { value: 'endingSoon', label: 'رو به پایان' },
  { value: 'ended', label: 'تمام‌شده' },
  { value: 'all', label: 'همه' }
]

function inFilter(contract: ContractWithDetails, filter: StatusFilter): boolean {
  switch (filter) {
    case 'active':
      return contract.status === 'active'
    case 'endingSoon':
      return isEndingSoon(contract)
    case 'ended':
      return contract.status !== 'active'
    default:
      return true
  }
}

/** a renewal follow-up a month before the end (or today, if that has passed) */
function renewalDate(endDate: string): string {
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`)
  const target = new Date(end.getTime() - ENDING_SOON_DAYS * 86_400_000)
  const today = new Date()
  const day = target.getTime() < today.getTime() ? today : target
  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  const jalali = gregorianIsoToJalali(iso)
  return jalali ? formatJalaliDate(jalali) : ''
}

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
  // tabs stay mounted (lazy: false): reload on every return to this tab, or a contract saved from a follow-up never
  // shows here (same fix as FilesScreen; emulator test 2026-10-24)
  useEffect(() => {
    if (typeof navigation.addListener !== 'function') {
      return undefined
    }
    return navigation.addListener('focus', refetch)
  }, [navigation, refetch])
  const contractService = useContractService()
  const del = useUndoableDelete({
    noun: 'قرارداد',
    remove: async (id) => {
      if (!contractService) throw new Error('not ready')
      await contractService.deleteContract(id)
    },
    onDeleted: refetch
  })

  // §16/§20 of the brief — search was removed from the current spec but
  // the affordance stays ready to add back without a redesign: the icon
  // reveals a field that filters the already-loaded list client-side,
  // not a permanently-occupied search bar (§0.2's UI-overload ban), and
  // not a new server-side query (`useContracts` is unchanged).
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const filteredContracts = useMemo(() => {
    if (!contracts) {
      return contracts
    }
    return contracts.filter(
      (contract) =>
        !del.hidden.has(contract.id) &&
        inFilter(contract, statusFilter) &&
        matchesSearch(contract, search)
    )
  }, [contracts, statusFilter, search, del.hidden])

  const counts = useMemo(() => {
    const visible = (contracts ?? []).filter((contract) => !del.hidden.has(contract.id))
    const result = {} as Record<StatusFilter, number>
    for (const option of STATUS_FILTER_OPTIONS) {
      result[option.value] = visible.filter((contract) => inFilter(contract, option.value)).length
    }
    return result
  }, [contracts, del.hidden])

  function toggleSearch(): void {
    setIsSearchVisible((current) => {
      if (current) {
        setSearch('')
      }
      return !current
    })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[theme.typography('headlineMd'), styles.pageTitle]}>قراردادها</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="جستجو در قراردادها"
            accessibilityState={{ selected: isSearchVisible }}
            onPress={toggleSearch}
            style={[styles.searchToggle, isSearchVisible && styles.searchToggleActive]}
          >
            <Icon name="search" size="sm" color={isSearchVisible ? theme.colors.onPrimaryContainer : theme.colors.onSurface} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar} contentContainerStyle={styles.chips}>
          {STATUS_FILTER_OPTIONS.map((option) => {
            const selected = option.value === statusFilter
            const count = counts[option.value]
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => setStatusFilter(option.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[theme.typography('labelMd'), selected ? styles.chipTextSelected : styles.chipText]}>
                  {count > 0 && option.value !== 'all' ? `${option.label} ${toPersianDigits(String(count))}` : option.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

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
                onRenewReminder={() =>
                  navigation.navigate('CreateReminder', {
                    propertyId: item.propertyId,
                    applicantId: item.applicantId,
                    dealId: item.dealId ?? undefined,
                    title: `تمدید قرارداد ${item.property?.title ?? ''}`.trim(),
                    date: renewalDate(item.endDate)
                  })
                }
                onLongPress={() =>
                  del.onLongPress(item.id, `${item.property?.title ?? 'ملک'} · ${item.applicant?.fullName ?? 'متقاضی'}`)
                }
              />
            )}
          />
        )}
        <FloatingActionButton
          accessibilityLabel="قرارداد تازه"
          label="قرارداد تازه"
          onPress={() => navigation.navigate('DealList')}
        />
      </View>
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
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    pageTitle: { color: theme.colors.onSurface },
    chipsBar: { flexGrow: 0 },
    chips: { gap: theme.spacing.space2 },
    chip: {
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipText: { color: theme.colors.onSurface },
    chipTextSelected: { color: theme.colors.onPrimary, fontWeight: '700' },
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
    list: {
      gap: theme.spacing.space3,
      paddingBottom: 96
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
