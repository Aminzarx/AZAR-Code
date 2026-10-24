import React, { useContext, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NavigationContext } from '@react-navigation/native'
import { toPersianDigits } from '@shared/utils/persianText'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState } from './EmptyState'

export type ActivityItem = {
  id: string
  title: string
  description: string
  timestamp: string
}

type Props<T extends ActivityItem> = {
  activity: T[]
  emptyTitle?: string
  emptyDescription?: string
  /** When provided, each row becomes tappable (e.g. to navigate to the record the activity is about). */
  onSelect?: (item: T) => void
  /** Amin #5070: how many of the latest show before «بیشتر» */
  collapsedCount?: number
  /** a change of this (another tab of records, another list mode) folds the list back */
  resetKey?: string
}

const COLLAPSED_COUNT = 3

/**
 * design-system.md §9 (v2.6.0) — the one reusable Activity pattern for
 * every entity that has a history (Dashboard, Property, Applicant, Deal,
 * Contract): a connected timeline (dot + rail), not a stack of cards.
 * Each feature builds its own `toActivity()` mapper from its own records
 * (deals/reminders/notes/...) into this generic shape and renders it here
 * — the timeline itself never knows what kind of record produced a row.
 */
export function ActivityTimeline<T extends ActivityItem>({
  activity,
  emptyTitle = 'هنوز فعالیتی ثبت نشده',
  emptyDescription,
  onSelect,
  collapsedCount = COLLAPSED_COUNT,
  resetKey
}: Props<T>): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  // Amin #5070: not one long column — the latest few, «بیشتر» for the rest; folded again on another tab or mode
  const [expanded, setExpanded] = useState(false)
  const navigation = useContext(NavigationContext)
  useEffect(() => setExpanded(false), [resetKey])
  useEffect(() => navigation?.addListener('blur', () => setExpanded(false)), [navigation])

  if (activity.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const hidden = expanded ? 0 : Math.max(0, activity.length - collapsedCount)
  const shown = hidden > 0 ? activity.slice(0, collapsedCount) : activity

  return (
    <View style={styles.list}>
      {shown.map((item, index) => {
        const isLast = index === shown.length - 1
        const content = (
          <View style={[styles.content, isLast && styles.contentLast]}>
            <Text style={[theme.typography('titleSm'), styles.title]}>{item.title}</Text>
            <Text style={[theme.typography('bodySm'), styles.description]}>{item.description}</Text>
            <Text style={[theme.typography('labelSm'), styles.timestamp]}>{item.timestamp}</Text>
          </View>
        )
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            {onSelect ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => onSelect(item)}
                style={styles.pressableContent}
              >
                {content}
              </Pressable>
            ) : (
              content
            )}
          </View>
        )
      })}
      {activity.length > collapsedCount ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'نمایش کمتر' : `نمایش ${hidden} فعالیت دیگر`}
          onPress={() => setExpanded((current) => !current)}
          style={styles.more}
          hitSlop={theme.spacing.space2}
        >
          <Text style={[theme.typography('labelMd'), styles.moreText]}>
            {expanded ? 'کمتر' : `بیشتر (${toPersianDigits(String(hidden))})`}
          </Text>
        </Pressable>
      ) : null}
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
    more: {
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.spacing.space3,
      paddingVertical: theme.spacing.space1
    },
    moreText: { color: theme.colors.primary },
    pressableContent: {
      flex: 1
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
