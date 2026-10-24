import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  EmptyState,
  ErrorState,
  LoadingIndicator,
  ScreenHeaderBar
} from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import { useUndoableDelete } from '@shared/hooks/useUndoableDelete'
import { useDeals } from '../hooks/useDeals'
import { useDealService } from '../hooks/useDealService'
import { useIncompleteReminders } from '../hooks/useIncompleteReminders'
import { DealListItem } from '../components/DealListItem'
import { dealFilterGroup, type DealFilterGroup } from '../dealPipeline'
import type { DealStage } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'DealList'>

function chipOf(stage: DealStage): Exclude<DealFilterGroup, 'all' | 'new'> {
  const group = dealFilterGroup(stage)
  return group === 'new' ? 'inProgress' : group
}

// v1.4.0 (approved «معاملات» design): four chips with counts; a brand-new
// deal counts as «در جریان».
type ChipFilter = Exclude<DealFilterGroup, 'new'>
const FILTER_OPTIONS: readonly { value: ChipFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'inProgress', label: 'در جریان' },
  { value: 'won', label: 'موفق' },
  { value: 'lost', label: 'لغوشده' }
]

export function DealListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { deals, isLoading, error, refetch } = useDeals(userId)
  const { reminders } = useIncompleteReminders(userId)
  const [filter, setFilter] = useState<ChipFilter>('all')
  const dealService = useDealService()
  const del = useUndoableDelete({
    noun: 'معامله',
    remove: async (id) => {
      if (!dealService) throw new Error('not ready')
      await dealService.deleteDeal(id)
    },
    onDeleted: refetch
  })

  // Soonest not-done reminder per deal, computed once for the whole
  // screen (not per row) — see `useIncompleteReminders`'s doc comment.
  const nextReminderByDeal = useMemo(() => {
    if (!reminders) {
      return null
    }
    const map = new Map<string, ReminderRecord>()
    for (const reminder of reminders) {
      if (!reminder.dealId) {
        continue
      }
      const existing = map.get(reminder.dealId)
      if (
        !existing ||
        new Date(reminder.remindAt).getTime() < new Date(existing.remindAt).getTime()
      ) {
        map.set(reminder.dealId, reminder)
      }
    }
    return map
  }, [reminders])

  const filteredDeals = useMemo(() => {
    if (!deals) {
      return deals
    }
    const visible = deals.filter((deal) => !del.hidden.has(deal.id))
    if (filter === 'all') {
      return visible
    }
    return visible.filter((deal) => chipOf(deal.currentStage) === filter)
  }, [deals, filter, del.hidden])

  const counts = useMemo(() => {
    const result: Record<ChipFilter, number> = { all: 0, inProgress: 0, won: 0, lost: 0 }
    for (const deal of deals ?? []) {
      if (del.hidden.has(deal.id)) continue
      result.all += 1
      result[chipOf(deal.currentStage)] += 1
    }
    return result
  }, [deals, del.hidden])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeaderBar onBack={() => navigation.goBack()} title="معاملات" section="deal" />
      <View style={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBar}>
          {FILTER_OPTIONS.map((option) => {
            const selected = option.value === filter
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => setFilter(option.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[theme.typography('labelMd'), selected ? styles.chipTextSelected : styles.chipText]}>
                  {option.label}
                </Text>
                <Text style={[theme.typography('labelMd'), selected ? styles.chipTextSelected : styles.chipCount]}>
                  {toPersianDigits(String(counts[option.value]))}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری معامله‌ها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : deals && deals.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز معامله‌ای ثبت نشده"
              description="با ایجاد معامله از پیشنهادهای تطابق، اینجا نمایش داده می‌شود."
              actionLabel="رفتن به تطبیق"
              onAction={() => navigation.navigate('Matching')}
            />
          </View>
        ) : filteredDeals && filteredDeals.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="معامله‌ای با این فیلتر پیدا نشد"
              description="فیلتر دیگری را انتخاب کنید."
              actionLabel="نمایش همه"
              onAction={() => setFilter('all')}
            />
          </View>
        ) : (
          <FlatList
            data={filteredDeals ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <DealListItem
                deal={item}
                nextReminder={nextReminderByDeal?.get(item.id)}
                onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
                onLongPress={() =>
                  del.onLongPress(item.id, `${item.property?.title ?? 'ملک'} · ${item.applicant?.fullName ?? 'متقاضی'}`)
                }
              />
            )}
          />
        )}
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
    list: {
      gap: theme.spacing.space3,
      paddingBottom: theme.spacing.space6
    },
    chipsBar: { flexGrow: 0 },
    chips: { gap: theme.spacing.space2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipText: { color: theme.colors.onSurface },
    chipCount: { color: theme.colors.onSurfaceVariant },
    chipTextSelected: { color: theme.colors.onPrimary, fontWeight: '700' },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
