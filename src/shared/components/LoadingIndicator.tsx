import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  /**
   * design-system.md §7.6 — determinate (with a known percentage) for
   * genuinely long operations (encryption, large-file validation);
   * indeterminate for brief local steps. Indeterminate spinners must not
   * be used for instantaneous local reads — callers, not this component,
   * are responsible for that.
   */
  variant?: 'determinate' | 'indeterminate'
  /** 0-1, required when variant is 'determinate'. */
  progress?: number
  size?: 'small' | 'large'
}

export function LoadingIndicator({
  variant = 'indeterminate',
  progress = 0,
  size = 'small'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  if (variant === 'indeterminate') {
    return <ActivityIndicator color={theme.colors.secondary} size={size} />
  }

  const clamped = Math.min(1, Math.max(0, progress))
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    track: {
      height: 4,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      overflow: 'hidden'
    },
    fill: {
      height: '100%',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondary
    }
  })
}
