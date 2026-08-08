import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'

export type QuickAction = {
  id: string
  label: string
  onPress: () => void
}

type Props = {
  actions: QuickAction[]
}

/** design-system.md §9 touch-target rule applies here too — each action's hit area is the full card. */
export function QuickActions({ actions }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <View key={action.id} style={styles.item}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
          >
            <Card style={styles.card}>
              <Text style={[theme.typography('labelMd'), styles.label]}>{action.label}</Text>
            </Card>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space3
    },
    item: {
      minWidth: '45%',
      flexGrow: 1
    },
    card: {
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    label: {
      color: theme.colors.primary,
      textAlign: 'center'
    }
  })
}
