import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from '@shared/components'

type Props = {
  overdueCount: number
  dueTodayCount: number
}

/**
 * design-system.md §17.3 / §14 point 3 — Reminder List's compact overdue +
 * due-today counts, styled like Dashboard's `NeedsAttentionList` rows
 * (attention-tone container, icon badge, label) rather than inventing a
 * new visual language for the same "needs attention" concept. Renders
 * nothing when both counts are zero — an empty attention row is noise, not
 * information (§14 point 3).
 */
export function ReminderAttentionHeader({
  overdueCount,
  dueTodayCount
}: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (overdueCount === 0 && dueTodayCount === 0) {
    return null
  }

  const tone = theme.status('attention')
  const rows: { id: string; label: string }[] = []
  if (dueTodayCount > 0) {
    rows.push({ id: 'due-today', label: `${dueTodayCount.toLocaleString('fa-IR')} پیگیری امروز` })
  }
  if (overdueCount > 0) {
    rows.push({
      id: 'overdue',
      label: `${overdueCount.toLocaleString('fa-IR')} پیگیری عقب‌افتاده`
    })
  }

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View
          key={row.id}
          accessibilityRole="text"
          style={[styles.row, { backgroundColor: tone.background }]}
        >
          <View style={[styles.iconBadge, { backgroundColor: tone.foreground }]}>
            <Icon name="calendar" size="xs" color={theme.colors.onPrimary} />
          </View>
          <Text style={[theme.typography('labelMd'), styles.label, { color: tone.foreground }]}>
            {row.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.layout.componentSpacing
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.large
    },
    iconBadge: {
      width: theme.iconSize.lg,
      height: theme.iconSize.lg,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    label: {
      flex: 1,
      textAlign: theme.isRTL ? 'right' : 'left'
    }
  })
}
