import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import {
  ActivityTimeline,
  Card,
  EmptyState,
  ErrorState,
  LoadingIndicator,
  StatusBadge,
  type ActivityItem
} from '@shared/components'
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
    title: 'معامله مرتبط با این متقاضی',
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
 * The single most useful incomplete reminder to surface: the most
 * overdue one if any exists, otherwise the soonest upcoming one — §14 of
 * the brief ("highlight the soonest upcoming or most overdue one").
 */
function pickNextFollowUp(reminders: ReminderRecord[], now: Date): ReminderRecord | null {
  const incomplete = reminders.filter((reminder) => !reminder.isDone)
  if (incomplete.length === 0) {
    return null
  }
  const overdue = incomplete
    .filter((reminder) => new Date(reminder.remindAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
  if (overdue.length > 0) {
    return overdue[0]
  }
  return incomplete.sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
  )[0]
}

/**
 * Applicant Detail's Activity section (§14 of the brief) — this
 * applicant's related deals/reminders (reusing `DealRepository.getByApplicant`
 * and the new `ReminderRepository.getByApplicant`, already fetched by
 * `useApplicantActivity`), plus a highlighted next-follow-up card when an
 * incomplete reminder exists.
 */
export function ApplicantActivitySection({
  deals,
  reminders,
  isLoading,
  error,
  onRetry
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const activity = deals && reminders ? toActivity(deals, reminders) : []
  const nextFollowUp = reminders ? pickNextFollowUp(reminders, new Date()) : null
  const isOverdue = nextFollowUp ? new Date(nextFollowUp.remindAt).getTime() <= Date.now() : false

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('titleMd'), styles.heading]}>فعالیت</Text>

      {nextFollowUp ? (
        <Card>
          <View style={styles.followUpHeader}>
            <Text style={[theme.typography('titleSm'), styles.followUpTitle]}>
              {nextFollowUp.title}
            </Text>
            <StatusBadge
              label={isOverdue ? 'عقب‌افتاده' : 'پیگیری بعدی'}
              tone={isOverdue ? 'attention' : 'inProgress'}
            />
          </View>
          <Text style={[theme.typography('bodySm'), styles.followUpTimestamp]}>
            {formatDateTime(nextFollowUp.remindAt)}
          </Text>
        </Card>
      ) : null}

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
          description="معامله یا یادآوری مرتبط با این متقاضی اینجا نمایش داده می‌شود."
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
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    followUpHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    followUpTitle: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    followUpTimestamp: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space6
    }
  })
}
