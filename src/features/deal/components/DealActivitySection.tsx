import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { ActivityTimeline, ErrorState, LoadingIndicator } from '@shared/components'
import type { ActivityItem } from '@shared/components'
import type { DealStageHistoryRecord } from '@infrastructure/database/repositories/DealRepository'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import { DEAL_STAGE_LABELS } from '@shared/data/dealStageLabels'
import { formatDateTime } from '@shared/utils/formatDate'

type Props = {
  stageHistory: DealStageHistoryRecord[] | null
  reminders: ReminderRecord[] | null
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

function toActivity(
  stageHistory: DealStageHistoryRecord[],
  reminders: ReminderRecord[]
): ActivityItem[] {
  const stageItems: (ActivityItem & { sortKey: string })[] = stageHistory.map((entry) => ({
    id: `stage-${entry.id}`,
    title: entry.fromStage
      ? `انتقال از ${DEAL_STAGE_LABELS[entry.fromStage]} به ${DEAL_STAGE_LABELS[entry.toStage]}`
      : `ایجاد معامله در مرحله ${DEAL_STAGE_LABELS[entry.toStage]}`,
    description: entry.note ?? '—',
    timestamp: formatDateTime(entry.changedAt),
    sortKey: entry.changedAt
  }))
  const reminderItems: (ActivityItem & { sortKey: string })[] = reminders.map((reminder) => ({
    id: `reminder-${reminder.id}`,
    title: reminder.title,
    description: reminder.isDone ? 'انجام‌شده' : 'در انتظار پیگیری',
    timestamp: formatDateTime(reminder.remindAt),
    sortKey: reminder.remindAt
  }))
  return [...stageItems, ...reminderItems].sort(
    (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime()
  )
}

/**
 * design-system.md §17.2 Deal Detail's Activity section — this deal's
 * own stage-transition history (`DealRepository.getStageHistory`, real
 * data, not fabricated) plus its linked reminders, reusing the shared
 * `ActivityTimeline` component (§9) exactly like
 * `PropertyActivitySection`.
 */
export function DealActivitySection({
  stageHistory,
  reminders,
  isLoading,
  error,
  onRetry
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const activity = stageHistory && reminders ? toActivity(stageHistory, reminders) : []

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
      ) : (
        <ActivityTimeline
          activity={activity}
          emptyDescription="تغییر مرحله یا یادآوری مرتبط با این معامله اینجا نمایش داده می‌شود."
        />
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
