import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, Icon, type IconName } from '@shared/components'
import type { DashboardStat } from '../types'

type Props = {
  stat: DashboardStat
  onPress?: () => void
}

type StatVisual = {
  icon: IconName
  container: keyof Theme['colors']
  onContainer: keyof Theme['colors']
}

/**
 * Visual accent per stat id — icon + a container/on-container color pair
 * already in the design system (design-tokens.json), not new colors.
 * Falls back to the secondary pair for any stat id this map doesn't know
 * about yet, so a future stat never renders without an accent.
 */
const STAT_VISUALS: Record<string, StatVisual> = {
  properties: { icon: 'files', container: 'primaryContainer', onContainer: 'onPrimaryContainer' },
  applicants: {
    icon: 'person',
    container: 'secondaryContainer',
    onContainer: 'onSecondaryContainer'
  },
  deals: { icon: 'matching', container: 'warningContainer', onContainer: 'onWarningContainer' },
  contracts: {
    icon: 'contract',
    container: 'tertiaryContainer',
    onContainer: 'onTertiaryContainer'
  }
}
const DEFAULT_VISUAL: StatVisual = {
  icon: 'inbox',
  container: 'secondaryContainer',
  onContainer: 'onSecondaryContainer'
}

export function StatCard({ stat, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const visual = STAT_VISUALS[stat.id] ?? DEFAULT_VISUAL
  const styles = createStyles(theme, theme.colors[visual.container])
  const label = `${stat.label}: ${stat.value}`

  const content = (
    <Card style={styles.card}>
      <View accessible={!onPress} accessibilityLabel={onPress ? undefined : label}>
        <View style={styles.iconBadge}>
          <Icon name={visual.icon} size="sm" color={theme.colors[visual.onContainer]} />
        </View>
        <Text style={[theme.typography('headlineLgMobile'), styles.value]}>{stat.value}</Text>
        <Text
          style={[theme.typography('bodySm'), styles.label]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {stat.label}
        </Text>
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

function createStyles(theme: Theme, badgeColor: string) {
  return StyleSheet.create({
    // design-system.md §7.3.1 — fixed 2-column percentage grid, not a
    // minWidth/flex threshold (that collapses to 1 column on phones
    // <=390px wide and produces an oversized, near-empty card).
    card: {
      flexBasis: theme.component.statCardGrid.columnBasisPercent,
      flexGrow: 0
    },
    iconBadge: {
      width: theme.iconSize.xl * 0.6,
      height: theme.iconSize.xl * 0.6,
      borderRadius: theme.radius.full,
      backgroundColor: badgeColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.space3
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
