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
    title: {
      color: theme.colors.onSurface
    },
    timestamp: {
      color: theme.colors.outline,
      marginTop: theme.spacing.space1
    }
  })
}
