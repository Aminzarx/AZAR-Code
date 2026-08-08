import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import type { DashboardStat } from '../types'

type Props = {
  stat: DashboardStat
}

export function StatCard({ stat }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Card style={styles.card}>
      <View accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
        <Text style={[theme.typography('headlineMd'), styles.value]}>{stat.value}</Text>
        <Text style={[theme.typography('bodySm'), styles.label]}>{stat.label}</Text>
      </View>
    </Card>
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
