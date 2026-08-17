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
  bg: keyof Theme['colors']
  onBg: keyof Theme['colors']
}

/**
 * v2.9.1: flat, single-color icon badges (was a per-stat two-color
 * gradient) per explicit user direction that gradients read as
 * decorative and should become single-color, and that the app should
 * only ever show navy or gray, never the old bronze/amber/emerald
 * accent colors. Alternates `primary` (navy) and `onSurfaceVariant`
 * (gray) across the four stats so the row keeps some visual rhythm
 * without introducing a third hue.
 */
const STAT_VISUALS: Record<string, StatVisual> = {
  properties: { icon: 'files', bg: 'primary', onBg: 'onPrimary' },
  applicants: { icon: 'person', bg: 'onSurfaceVariant', onBg: 'onPrimary' },
  deals: { icon: 'deal', bg: 'primary', onBg: 'onPrimary' },
  contracts: { icon: 'contract', bg: 'onSurfaceVariant', onBg: 'onPrimary' }
}
const DEFAULT_VISUAL: StatVisual = { icon: 'inbox', bg: 'onSurfaceVariant', onBg: 'onPrimary' }

export function StatCard({ stat, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const visual = STAT_VISUALS[stat.id] ?? DEFAULT_VISUAL
  const styles = createStyles(theme, visual)
  const label = `${stat.label}: ${stat.value}`

  // design-system.md §14 point 2 — the KPI row is context, not the point
  // of the screen, so this stays visually quieter than the Needs
  // Attention section below it; a soft level1 shadow (the same "barely
  // visible in isolation, reads as lifted in context" treatment every
  // other card in the app uses) reads as more considered than a bare
  // hairline border without competing for attention.
  //
  // The flexBasis/gap grid contract (§7.3.1) lives on the OUTER wrapper
  // only (Pressable when interactive, this bare View otherwise) — Card
  // itself carries just its own padding and stretches to fill that
  // wrapper via RN's default `alignItems: stretch`. Previously the same
  // style (flexBasis + padding) was applied to BOTH the wrapper and the
  // inner Card, nesting a 47%-wide flexBasis inside an already-47%-wide
  // parent and shrinking the visible card to a fraction of its intended
  // size — which read as "too much empty gap" between cards even though
  // `statCardGrid.gap` itself was already correct.
  const content = (
    <Card style={styles.cardBody}>
      <View
        style={styles.row}
        accessible={!onPress}
        accessibilityLabel={onPress ? undefined : label}
      >
        <View style={styles.iconBadge}>
          <Icon name={visual.icon} size="xs" color={theme.colors[visual.onBg]} />
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
    return <View style={styles.cardWrapper}>{content}</View>
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.cardWrapper}
    >
      {content}
    </Pressable>
  )
}

function createStyles(theme: Theme, visual: StatVisual) {
  return StyleSheet.create({
    // design-system.md §7.3.1 — fixed 2-column percentage grid, not a
    // minWidth/flex threshold (that collapses to 1 column on phones
    // <=390px wide and produces an oversized, near-empty card). Only the
    // grid-positioning contract lives here — no padding, see cardBody.
    cardWrapper: {
      flexBasis: theme.component.statCardGrid.columnBasisPercent,
      flexGrow: 0
    },
    cardBody: {
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
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
      backgroundColor: theme.colors[visual.bg]
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
