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
  deals: { icon: 'deal', container: 'warningContainer', onContainer: 'onWarningContainer' },
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
    // design-system.md §14 point 2 — the KPI row is context, not the point
    // of the screen; `flat` (hairline border, no shadow) keeps it visually
    // quieter than the Needs Attention section below it, which is the
    // section that should actually read as urgent/important.
    <Card style={styles.card} flat>
      <View
        style={styles.row}
        accessible={!onPress}
        accessibilityLabel={onPress ? undefined : label}
      >
        <View style={styles.iconBadge}>
          <Icon name={visual.icon} size="xs" color={theme.colors[visual.onContainer]} />
        </View>
        <View style={styles.textColumn}>
          <Text style={[theme.typography('titleMd'), styles.value]}>{stat.value}</Text>
          <Text
            style={[theme.typography('labelSm'), styles.label]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stat.label}
          </Text>
        </View>
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
      flexGrow: 0,
      // v2.8.5: bumped back up from space2(8) — the cards read as too
      // small/cramped at that padding, especially after the icon scale
      // grew a step. Still denser than the default listItem padding (a
      // KPI card holds a single number + short label, not paragraph
      // content).
      padding: theme.spacing.space3
    },
    // Horizontal icon+text layout instead of a stacked badge-over-number
    // layout — shorter overall card height for the same content.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    iconBadge: {
      width: theme.iconSize.lg,
      height: theme.iconSize.lg,
      borderRadius: theme.radius.full,
      backgroundColor: badgeColor,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    textColumn: {
      flexShrink: 1,
      minWidth: 0
    },
    value: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
