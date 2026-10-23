import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

export type SpecTile = {
  label: string
  value: string
}

/**
 * v1.3.0 (design batch 2): the detail page's key facts (area, rooms,
 * property type…) as small side-by-side tiles under the price, in the
 * same quiet style as Home's summary tiles.
 */
export function SpecTiles({ tiles }: { tiles: readonly SpecTile[] }): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  if (tiles.length === 0) {
    return null
  }
  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          style={styles.tile}
          accessible
          accessibilityLabel={`${tile.label}: ${tile.value}`}
        >
          <Text
            style={[theme.typography('titleSm'), styles.value]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {tile.value}
          </Text>
          <Text style={[theme.typography('labelSm'), styles.label]} numberOfLines={1}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.spacing.space2 },
    tile: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space1,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLow,
      gap: 2
    },
    value: { color: theme.colors.onSurface },
    label: { color: theme.colors.onSurfaceVariant }
  })
}
