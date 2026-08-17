import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  /** Full name used for the initials fallback when no image is available. */
  name: string
  imageUri?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 32, md: 40, lg: 56 } as const

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * design-tokens.json §10 groups avatars with circular components
 * (radius-full); no dedicated avatar spec exists yet in design-system.md
 * §8. v2.9.1: the initials fallback dropped its diagonal gradient (was
 * secondary bronze -> primary ink) for a flat `primary` navy fill per
 * explicit user direction that gradients should be single-color —
 * simpler, and no longer needs `react-native-svg` for this component.
 */
export function Avatar({ name, imageUri, size = 'md' }: Props): React.JSX.Element {
  const theme = useTheme()
  const dimension = SIZES[size]
  const styles = createStyles(theme, dimension)

  if (imageUri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={name}
        source={{ uri: imageUri }}
        style={styles.image}
      />
    )
  }

  return (
    <View accessibilityLabel={name} style={styles.fallback}>
      <Text style={styles.initials}>{initialsFrom(name)}</Text>
    </View>
  )
}

function createStyles(theme: Theme, dimension: number) {
  return StyleSheet.create({
    image: {
      width: dimension,
      height: dimension,
      borderRadius: theme.radius.full
    },
    fallback: {
      width: dimension,
      height: dimension,
      borderRadius: theme.radius.full,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary
    },
    initials: {
      color: theme.colors.onPrimary,
      fontSize: dimension * 0.4,
      fontWeight: '600'
    }
  })
}
