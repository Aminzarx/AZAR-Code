import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'
import { Icon } from './Icon'

type Props = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  /** Defaults to the generic "inbox" glyph; pass a different `<Icon>` for a more specific context. */
  icon?: React.ReactNode
  /**
   * design-system.md §7.7 — use when this EmptyState is nested inside a
   * page section that has other content around it (not the only thing on
   * the screen). Smaller padding + icon so it doesn't dominate the section.
   */
  compact?: boolean
}

/** design-system.md §7.7 — centered icon + title-sm heading + body-sm supporting text + optional action. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  compact
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme, compact ?? false)
  const iconSize = compact ? 'md' : 'lg'

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        {icon ?? <Icon name="inbox" size={iconSize} color={theme.colors.onSurfaceVariant} />}
      </View>
      <Text style={[theme.typography('titleSm'), styles.title]}>{title}</Text>
      {description ? (
        <Text style={[theme.typography('bodySm'), styles.description]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.actionSpacing}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? theme.component.emptyStateCompact.padding : theme.spacing.space8,
      gap: theme.spacing.space3
    },
    // Badge is 1.5x the icon it contains, matching the non-compact
    // iconSize.lg(32)-in-iconSize.xl(48) badge proportion.
    iconBadge: {
      width: compact ? theme.component.emptyStateCompact.iconSize * 1.5 : theme.iconSize.xl,
      height: compact ? theme.component.emptyStateCompact.iconSize * 1.5 : theme.iconSize.xl,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      color: theme.colors.onSurface
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center'
    },
    actionSpacing: {
      marginTop: theme.spacing.space3
    }
  })
}
