import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EntityIconBadge, StatusBadge } from '@shared/components'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import { DEAL_STAGE_LABELS } from '@shared/data/dealStageLabels'
import { formatDateTime } from '@shared/utils/formatDate'
import { dealStageTone } from '../dealPipeline'
import type { DealWithDetails } from '../types'

type Props = {
  deal: DealWithDetails
  /** Soonest not-done reminder linked to this deal, if one exists — computed once for the whole list, not per row (see `useIncompleteReminders`). */
  nextReminder?: ReminderRecord
  onPress: () => void
}

export function DealListItem({ deal, nextReminder, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const isOverdue = Boolean(nextReminder) && new Date(nextReminder!.remindAt).getTime() < Date.now()
  const styles = createStyles(theme, isOverdue)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.property?.title ?? 'ملک نامشخص'} - ${deal.applicant?.fullName ?? 'متقاضی نامشخص'}`}
      onPress={onPress}
    >
      <Card>
        <View style={styles.header}>
          <EntityIconBadge icon="deal" tone="tertiary" />
          <View style={styles.identity}>
            <Text
              style={[theme.typography('titleSm'), styles.title]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {deal.property?.title ?? 'ملک نامشخص'}
            </Text>
            <Text
              style={[theme.typography('bodySm'), styles.subtitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {deal.applicant?.fullName ?? 'متقاضی نامشخص'}
            </Text>
          </View>
          <StatusBadge
            label={DEAL_STAGE_LABELS[deal.currentStage]}
            tone={dealStageTone(deal.currentStage)}
          />
        </View>
        {nextReminder ? (
          <Text
            style={[theme.typography('labelSm'), styles.hint]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {`پیگیری بعدی: ${nextReminder.title} • ${formatDateTime(nextReminder.remindAt)}`}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme, isOverdue: boolean) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    identity: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container (here,
    // `identity`) doesn't reliably stretch to full width, so alignSelf
    // anchors the box to the correct edge.
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    hint: {
      color: isOverdue ? theme.colors.warning : theme.colors.outline,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
