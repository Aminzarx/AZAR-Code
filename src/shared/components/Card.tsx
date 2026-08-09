import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
  /** design-system.md §7.3 — list-item cards use radius-large; detail cards use radius-extra-large. */
  variant?: 'listItem' | 'detail'
  /** elevation-0 for cards nested inside an already-elevated container (e.g. inside a bottom sheet). */
  flat?: boolean
  style?: StyleProp<ViewStyle>
}

export function Card({ children, variant = 'listItem', flat, style }: Props): React.JSX.Element {
  const theme = useTheme()
  const isDetail = variant === 'detail'
  const styles = createStyles(theme)

  return (
    <View
      style={[
        isDetail ? styles.detail : styles.listItem,
        flat ? styles.flat : theme.elevation.level1,
        style
      ]}
    >
      {children}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    listItem: {
      borderRadius: theme.component.card.radiusListItem,
      padding: theme.component.card.paddingListItem,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    detail: {
      borderRadius: theme.component.card.radiusDetail,
      padding: theme.component.card.paddingDetail,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    flat: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    }
  })
}
