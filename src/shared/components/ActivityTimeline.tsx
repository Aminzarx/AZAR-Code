import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState } from './EmptyState'

export type ActivityItem = {
  id: string
  title: string
  description: string
  timestamp: string
}

type Props = {
  activity: ActivityItem[]
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * design-system.md §9 (v2.6.0) — the one reusable Activity pattern for
 * every entity that has a history (Dashboard, Property, Applicant, Deal,
 * Contract): a connected timeline (dot + rail), not a stack of cards.
 * Each feature builds its own `toActivity()` mapper from its own records
 * (deals/reminders/notes/...) into this generic shape and renders it here
 * — the timeline itself never knows what kind of record produced a row.
 */
export function ActivityTimeline({
  activity,
  emptyTitle = 'هنوز فعالیتی ثبت نشده',
  emptyDescription
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (activity.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <View style={styles.list}>
      {activity.map((item, index) => {
        const isLast = index === activity.length - 1
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={[styles.content, isLast && styles.contentLast]}>
              <Text style={[theme.typography('titleSm'), styles.title]}>{item.title}</Text>
              <Text style={[theme.typography('bodySm'), styles.description]}>
                {item.description}
              </Text>
              <Text style={[theme.typography('labelSm'), styles.timestamp]}>{item.timestamp}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing.space0
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.space3
    },
    rail: {
      width: theme.spacing.space3,
      alignItems: 'center'
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondary,
      marginTop: theme.spacing.space1
    },
    line: {
      flex: 1,
      width: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginTop: theme.spacing.space1
    },
    content: {
      flex: 1,
      paddingBottom: theme.spacing.space4
    },
    contentLast: {
      paddingBottom: 0
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    timestamp: {
      color: theme.colors.outline,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
