import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import type { DashboardStat } from '../types'

type Props = {
  stat: DashboardStat
  onPress?: () => void
}

export function StatCard({ stat, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const label = `${stat.label}: ${stat.value}`

  const content = (
    <Card style={styles.card}>
      <View accessible={!onPress} accessibilityLabel={onPress ? undefined : label}>
        <Text style={[theme.typography('headlineMd'), styles.value]}>{stat.value}</Text>
        <Text style={[theme.typography('bodySm'), styles.label]}>{stat.label}</Text>
      </View>
    </Card>
  )

  if (!onPress) {
    return content
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.card}
    >
      {content}
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 100
    },
    value: {
      color: theme.colors.onSurface
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    }
  })
}
