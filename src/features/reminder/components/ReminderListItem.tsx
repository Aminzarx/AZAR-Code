import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EntityIconBadge } from '@shared/components'
import { formatDateTime } from '@shared/utils/formatDate'
import type { Reminder } from '../types'
import type { ReminderContext } from '../hooks/useReminderContexts'

type Props = {
  reminder: Reminder
  onPress: () => void
  onToggleDone: () => void
  /** Linked property/applicant/deal name, when the reminder is tied to one — omit for a bare reminder. */
  context?: ReminderContext | null
}

export function ReminderListItem({
  reminder,
  onPress,
  onToggleDone,
  context
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const contextText = context
    ? [context.primary, context.secondary].filter(Boolean).join(' × ')
    : null

  return (
    <Card>
      <View style={styles.row}>
        <EntityIconBadge icon="calendar" tone="secondary" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reminder.title}
          onPress={onPress}
          style={styles.content}
        >
          {contextText ? (
            <Text style={[theme.typography('labelSm'), styles.context]} numberOfLines={1}>
              {contextText}
            </Text>
          ) : null}
          <Text
            style={[theme.typography('titleSm'), styles.title, reminder.isDone && styles.titleDone]}
          >
            {reminder.title}
          </Text>
          <Text style={[theme.typography('bodySm'), styles.subtitle]}>
            {formatDateTime(reminder.remindAt)}
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
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    context: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginBottom: theme.spacing.space1
    },
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    titleDone: {
      color: theme.colors.onSurfaceVariant,
      textDecorationLine: 'line-through'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
