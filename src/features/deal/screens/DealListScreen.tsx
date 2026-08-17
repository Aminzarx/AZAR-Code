import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  EmptyState,
  ErrorState,
  LoadingIndicator,
  ScreenHeaderBar,
  SegmentedControl
} from '@shared/components'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import { useDeals } from '../hooks/useDeals'
import { useIncompleteReminders } from '../hooks/useIncompleteReminders'
import { DealListItem } from '../components/DealListItem'
import { dealFilterGroup, type DealFilterGroup } from '../dealPipeline'

type Props = NativeStackScreenProps<MainStackParamList, 'DealList'>

const FILTER_OPTIONS: readonly { value: DealFilterGroup; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'new', label: 'جدید' },
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
  const [filter, setFilter] = useState<DealFilterGroup>('all')

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
    if (filter === 'all') {
      return deals
    }
    return deals.filter((deal) => dealFilterGroup(deal.currentStage) === filter)
  }, [deals, filter])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeaderBar onBack={() => navigation.goBack()} title="معاملات" />
      <View style={styles.content}>
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

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
