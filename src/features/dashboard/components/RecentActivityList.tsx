import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EmptyState } from '@shared/components'
import type { DashboardActivity } from '../types'

type Props = {
  activity: DashboardActivity[]
}

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
      {activity.map((item) => (
        <Card key={item.id} style={styles.item}>
          <Text style={[theme.typography('titleSm'), styles.title]}>{item.title}</Text>
          <Text style={[theme.typography('bodySm'), styles.description]}>{item.description}</Text>
          <Text style={[theme.typography('labelSm'), styles.timestamp]}>{item.timestamp}</Text>
        </Card>
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
    description: {
      color: theme.colors.onSurfaceVariant
    },
    timestamp: {
      color: theme.colors.outline,
      marginTop: theme.spacing.space1
    }
  })
}
