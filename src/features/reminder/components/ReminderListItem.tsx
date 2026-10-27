import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, MarqueeText, type IconName } from '@shared/components'
import { formatDateTime } from '@shared/utils/formatDate'
import type { Reminder, ReminderType } from '../types'
import type { ReminderContext } from '../hooks/useReminderContexts'

type Props = {
  reminder: Reminder
  onPress: () => void
  /** v1.4.0: long-press opens the row's action sheet (delete) */
  onLongPress?: () => void
  onToggleDone: () => void
  /** Linked property/applicant/deal name, when the reminder is tied to one — omit for a bare reminder. */
  context?: ReminderContext | null
  /** for tests: the moment «overdue» is measured against */
  now?: Date
}

type Tone = { container: string; onContainer: string; accent: string }

/** Amin #5608: each kind of reminder has its own icon and colour (design tokens only). */
const KINDS: Record<ReminderType, { icon: IconName; label: string }> = {
  call: { icon: 'phone', label: 'تماس' },
  visit: { icon: 'building', label: 'بازدید' },
  general: { icon: 'bell', label: 'یادآوری' }
}

function kindTone(theme: Theme, type: ReminderType): Tone {
  const c = theme.colors
  switch (type) {
    case 'call':
      return { container: c.infoContainer, onContainer: c.onInfoContainer, accent: c.info }
    case 'visit':
      return { container: c.successContainer, onContainer: c.onSuccessContainer, accent: c.success }
    default:
      return { container: c.secondaryContainer, onContainer: c.onSecondaryContainer, accent: c.primary }
  }
}

/**
 * Amin #5608: a reminder is a card, not a plain row. A coloured edge and icon say its kind (تماس / بازدید /
 * یادآوری); the time sits beside a clock; what is still open reads bold with a dot, a passed one says «عقب‌افتاده»
 * in red, and a done one fades with «انجام شد».
 */
export function ReminderListItem({
  reminder,
  onPress,
  onToggleDone,
  context,
  onLongPress,
  now = new Date()
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const kind = KINDS[reminder.reminderType] ?? KINDS.general
  const tone = kindTone(theme, reminder.reminderType)
  const overdue = !reminder.isDone && new Date(reminder.remindAt) < now
  const accent = reminder.isDone ? theme.colors.outlineVariant : overdue ? theme.colors.error : tone.accent
  const contextText = context ? [context.primary, context.secondary].filter(Boolean).join(' × ') : null

  return (
    <View style={[styles.card, { borderStartColor: accent }, reminder.isDone && styles.cardDone]}>
      <View style={[styles.badge, { backgroundColor: reminder.isDone ? theme.colors.surfaceContainerLow : tone.container }]}>
        <Icon name={kind.icon} size="sm" color={reminder.isDone ? theme.colors.onSurfaceVariant : tone.onContainer} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reminder.title}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={styles.content}
      >
        <View style={styles.metaRow}>
          <Text style={[theme.typography('labelSm'), { color: reminder.isDone ? theme.colors.onSurfaceVariant : tone.accent }]}>
            {kind.label}
          </Text>
          {overdue ? (
            <View style={[styles.pill, { backgroundColor: theme.colors.errorContainer }]}>
              <Text style={[theme.typography('labelSm'), { color: theme.colors.onErrorContainer }]}>عقب‌افتاده</Text>
            </View>
          ) : null}
          {reminder.isDone ? (
            <View style={[styles.pill, { backgroundColor: theme.colors.successContainer }]}>
              <Text style={[theme.typography('labelSm'), { color: theme.colors.onSuccessContainer }]}>انجام شد</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          {!reminder.isDone ? (
            <View
              accessibilityLabel="باز"
              style={[styles.dot, { backgroundColor: overdue ? theme.colors.error : tone.accent }]}
            />
          ) : null}
          <Text
            numberOfLines={2}
            style={[theme.typography('titleSm'), styles.title, reminder.isDone && styles.titleDone]}
          >
            {reminder.title}
          </Text>
        </View>
        {contextText ? (
          <MarqueeText style={[theme.typography('labelSm'), styles.context]}>{contextText}</MarqueeText>
        ) : null}
        <View style={styles.timeRow}>
          <Icon name="time" size="xs" color={overdue ? theme.colors.error : theme.colors.onSurfaceVariant} />
          <Text style={[theme.typography('bodySm'), { color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }]}>
            {formatDateTime(reminder.remindAt)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`علامت‌گذاری ${reminder.title} به‌عنوان انجام‌شده`}
        accessibilityState={{ checked: reminder.isDone }}
        onPress={onToggleDone}
        // Amin #5414: a smaller box; the touch area stays finger-sized
        hitSlop={10}
        style={[styles.checkbox, reminder.isDone && styles.checkboxDone]}
      >
        {reminder.isDone ? <Icon name="check" size="xs" color={theme.colors.onPrimary} /> : null}
      </Pressable>
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space4,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
      borderStartWidth: 4
    },
    cardDone: {
      backgroundColor: theme.colors.background
    },
    badge: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    content: {
      flex: 1,
      gap: theme.spacing.space1
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      alignSelf: start
    },
    pill: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 1,
      borderRadius: theme.radius.full
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      alignSelf: start,
      maxWidth: '100%'
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4
    },
    // design-system.md §10: a short Text in a column does not stretch, so alignSelf anchors it to the start edge
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    titleDone: {
      color: theme.colors.onSurfaceVariant,
      textDecorationLine: 'line-through'
    },
    context: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: start
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      alignSelf: start
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: theme.radius.small,
      borderWidth: 1.5,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checkboxDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    }
  })
}
