import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState } from '@shared/components'
import type { DashboardActivity } from '../types'

type Props = {
  activity: DashboardActivity[]
}

/** A connected timeline (dot + rail) instead of a plain list of cards — reads as chronological activity, not just a stack of boxes. */
export function RecentActivityList({ activity }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (activity.length === 0) {
    return (
      <EmptyState
        title="هنوز فعالیتی ثبت نشده"
        description="با افزودن پرونده‌های ملکی و متقاضیان، آخرین فعالیت‌های شما اینجا نمایش داده می‌شود."
      />
    )
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
    title: {
      color: theme.colors.onSurface
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    timestamp: {
      color: theme.colors.outline,
      marginTop: theme.spacing.space1
    }
  })
}
