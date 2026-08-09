import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'
import { Icon } from './Icon'

type Props = {
  title: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
}

/**
 * design-system.md §8.20 — operation-level error state (distinct from
 * §8.3's inline field-level validation errors): a dedicated error
 * presentation, e.g. a corrupted-backup or failed-operation screen.
 */
export function ErrorState({ title, description, retryLabel, onRetry }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Icon name="alert" size="lg" color={theme.colors.onErrorContainer} />
      </View>
      <Text style={[theme.typography('titleSm'), styles.title]}>{title}</Text>
      {description ? (
        <Text style={[theme.typography('bodySm'), styles.description]}>{description}</Text>
      ) : null}
      {retryLabel && onRetry ? (
        <View style={styles.actionSpacing}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" fullWidth={false} />
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
    iconBadge: {
      width: theme.iconSize.xl,
      height: theme.iconSize.xl,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.errorContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      color: theme.colors.onSurface,
      textAlign: 'center'
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
