import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'

type Props = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  /**
   * No icon font is bundled yet (Material Symbols Outlined, per
   * design-tokens.json `icon.family`, is Phase 11 asset-loading work) —
   * callers pass whatever icon element they already have (an emoji, an
   * SVG, a future icon-font glyph) rather than this component assuming
   * one specific icon library.
   */
  icon?: React.ReactNode
}

/** design-system.md §8.19 — centered icon + title-sm heading + body-sm supporting text + optional action. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.container}>
      {icon}
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.space8,
      gap: theme.spacing.space3
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
