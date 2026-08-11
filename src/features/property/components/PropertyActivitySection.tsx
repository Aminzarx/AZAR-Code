import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { ActivityTimeline, EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import type { ActivityItem } from '@shared/components'
import type { DealRecord } from '@infrastructure/database/repositories/DealRepository'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import { DEAL_STAGE_LABELS } from '@shared/data/dealStageLabels'
import { formatDate, formatDateTime } from '@shared/utils/formatDate'

type Props = {
  deals: DealRecord[] | null
  reminders: ReminderRecord[] | null
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

const MAX_ITEMS = 8

function toActivity(deals: DealRecord[], reminders: ReminderRecord[]): ActivityItem[] {
  const dealItems: (ActivityItem & { sortKey: string })[] = deals.map((deal) => ({
    id: `deal-${deal.id}`,
    title: 'معامله مرتبط با این ملک',
    description: DEAL_STAGE_LABELS[deal.currentStage],
    timestamp: formatDate(deal.updatedAt),
    sortKey: deal.updatedAt
  }))
  const reminderItems: (ActivityItem & { sortKey: string })[] = reminders.map((reminder) => ({
    id: `reminder-${reminder.id}`,
    title: reminder.title,
    description: reminder.isDone ? 'انجام‌شده' : 'در انتظار پیگیری',
    timestamp: formatDateTime(reminder.remindAt),
    sortKey: reminder.remindAt
  }))
  return [...dealItems, ...reminderItems]
    .sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime())
    .slice(0, MAX_ITEMS)
    .map(({ id, title, description, timestamp }) => ({ id, title, description, timestamp }))
}

/**
 * Property Detail's Activity section (§13 of the brief) — this
 * property's related deals/reminders, reusing `DealRepository.getByProperty`
 * and the new `ReminderRepository.getByProperty` read methods (already
 * fetched by `usePropertyActivity`, not queried here), rendered with the shared `ActivityTimeline` component (design-system.md
 * §9) instead of a new bespoke list component.
 */
export function PropertyActivitySection({
  deals,
  reminders,
  isLoading,
  error,
  onRetry
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const activity = deals && reminders ? toActivity(deals, reminders) : []

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('titleMd'), styles.heading]}>فعالیت</Text>
      {isLoading ? (
        <View style={styles.centeredSection}>
          <LoadingIndicator size="small" />
        </View>
      ) : error ? (
        <ErrorState
          title="بارگذاری فعالیت با مشکل مواجه شد"
          description={error.message}
          retryLabel="تلاش مجدد"
          onRetry={onRetry}
        />
      ) : activity.length === 0 ? (
        <EmptyState
          compact
          title="هنوز فعالیتی ثبت نشده"
          description="معامله یا یادآوری مرتبط با این ملک اینجا نمایش داده می‌شود."
        />
      ) : (
        <ActivityTimeline activity={activity} />
      )}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing.space3
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    heading: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space6
    }
  })
}
