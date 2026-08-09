import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  children: React.ReactNode
}

/**
 * Lays fields that logically belong together side by side (min/max price,
 * min/max area, start/end date — §5 of the forms/matching brief) instead
 * of stacking them full-width. Each child gets equal width; RTL row
 * mirroring is handled automatically by RN under I18nManager.forceRTL, so
 * no direction logic is needed here.
 */
export function FormRow({ children }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      {React.Children.map(children, (child) => (
        <View style={styles.field}>{child}</View>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.space3
    },
    field: {
      flex: 1
    }
  })
}
