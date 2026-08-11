import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
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
 * §8. The initials fallback is a soft diagonal gradient between the
 * app's two brand accents (secondary bronze -> primary ink) instead of a
 * single flat fill — a bit more "designed" per explicit feedback,
 * without introducing a third color (still just the two restrained
 * accents design-system.md §0.2 already establishes).
 */
export function Avatar({ name, imageUri, size = 'md' }: Props): React.JSX.Element {
  const theme = useTheme()
  const dimension = SIZES[size]
  const styles = createStyles(theme, dimension)
  const gradientId = `avatarGradient-${size}`

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
      <Svg
        width={dimension}
        height={dimension}
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.secondary} />
            <Stop offset="1" stopColor={theme.colors.primary} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={dimension / 2}
          fill={`url(#${gradientId})`}
        />
      </Svg>
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
      justifyContent: 'center'
    },
    initials: {
      color: theme.colors.onPrimary,
      fontSize: dimension * 0.4,
      fontWeight: '600'
    }
  })
}
