import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, Icon, type IconName } from '@shared/components'

export type QuickAction = {
  id: string
  label: string
  onPress: () => void
  icon?: IconName
}

type Props = {
  actions: QuickAction[]
}

/** design-system.md §9 touch-target rule applies here too — each action's hit area is the full row. */
export function QuickActions({ actions }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.list}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
        >
          <Card style={styles.card}>
            <View style={styles.iconBadge}>
              <Icon
                name={action.icon ?? 'plus'}
                size="sm"
                color={theme.colors.onSecondaryContainer}
              />
            </View>
            <Text style={[theme.typography('labelMd'), styles.label]}>{action.label}</Text>
            <Icon name="chevron" size="xs" color={theme.colors.outline} />
          </Card>
        </Pressable>
      ))}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing.space2
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum
    },
    iconBadge: {
      width: theme.iconSize.xl * 0.6,
      height: theme.iconSize.xl * 0.6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    label: {
      flex: 1,
      color: theme.colors.onSurface
    }
  })
}
