import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from '@shared/components'
import type { DashboardNeedsAttentionItem } from '../types'

type Props = {
  items: DashboardNeedsAttentionItem[]
  onSelect: (item: DashboardNeedsAttentionItem) => void
}

const ICON_BY_TARGET: Record<DashboardNeedsAttentionItem['target'], 'person' | 'deal'> = {
  ApplicantList: 'person',
  DealList: 'deal'
}

/**
 * design-system.md §14 point 3 — compact tappable rows, not a KPI-card
 * treatment: this section is what makes the Dashboard read as more urgent
 * than the calm KPI grid above it, so each row leans on its `tone`'s
 * container color (attention/inProgress) rather than the neutral card
 * surface `StatCard` uses.
 */
export function NeedsAttentionList({ items, onSelect }: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (items.length === 0) {
    return null
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const tone = theme.status(item.tone)
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => onSelect(item)}
            style={[styles.row, { backgroundColor: tone.background }]}
          >
            <View style={[styles.iconBadge, { backgroundColor: tone.foreground }]}>
              <Icon name={ICON_BY_TARGET[item.target]} size="xs" color={theme.colors.onPrimary} />
            </View>
            <Text
              style={[theme.typography('labelMd'), styles.label, { color: tone.foreground }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.label}
            </Text>
            <Icon name="chevron" size="xs" color={tone.foreground} />
          </Pressable>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.layout.componentSpacing
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.large
    },
    iconBadge: {
      width: theme.iconSize.lg,
      height: theme.iconSize.lg,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    label: {
      flex: 1
    }
  })
}
