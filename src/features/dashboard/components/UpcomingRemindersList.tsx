import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EmptyState } from '@shared/components'
import type { DashboardReminder } from '../types'

type Props = {
  reminders: DashboardReminder[]
  onSelect: (reminderId: string) => void
}

export function UpcomingRemindersList({ reminders, onSelect }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (reminders.length === 0) {
    return (
      <EmptyState
        compact
        title="یادآوری نزدیکی وجود ندارد"
        description="یادآوری‌های آینده شما اینجا نمایش داده می‌شود."
      />
    )
  }

  return (
    <View style={styles.list}>
      {reminders.map((reminder) => (
        <Pressable
          key={reminder.id}
          accessibilityRole="button"
          accessibilityLabel={reminder.title}
          onPress={() => onSelect(reminder.id)}
        >
          <Card style={styles.item}>
            <Text style={[theme.typography('titleSm'), styles.title]}>{reminder.title}</Text>
            <Text style={[theme.typography('labelSm'), styles.timestamp]}>
              {reminder.timestamp}
            </Text>
          </Card>
        </Pressable>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing.space3
    },
    item: {
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    timestamp: {
      color: theme.colors.outline,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
