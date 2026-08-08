import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import type { Reminder } from '../types'

type Props = {
  reminder: Reminder
  onPress: () => void
  onToggleDone: () => void
}

function formatRemindAt(remindAt: string): string {
  const date = new Date(remindAt)
  return `${date.toLocaleDateString('fa-IR')} — ${date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
}

export function ReminderListItem({ reminder, onPress, onToggleDone }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Card>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reminder.title}
          onPress={onPress}
          style={styles.content}
        >
          <Text
            style={[theme.typography('titleSm'), styles.title, reminder.isDone && styles.titleDone]}
          >
            {reminder.title}
          </Text>
          <Text style={[theme.typography('bodySm'), styles.subtitle]}>
            {formatRemindAt(reminder.remindAt)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`علامت‌گذاری ${reminder.title} به‌عنوان انجام‌شده`}
          accessibilityState={{ checked: reminder.isDone }}
          onPress={onToggleDone}
          style={[styles.checkbox, reminder.isDone && styles.checkboxDone]}
        >
          {reminder.isDone ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>
      </View>
    </Card>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    content: {
      flex: 1
    },
    title: {
      color: theme.colors.onSurface
    },
    titleDone: {
      color: theme.colors.onSurfaceVariant,
      textDecorationLine: 'line-through'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    checkbox: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      borderRadius: theme.radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checkboxDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    checkmark: {
      color: theme.colors.onPrimary
    }
  })
}
