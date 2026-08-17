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

/** design-system.md §8 touch-target rule applies here too — each action's hit area is the full row. */
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
            <View style={styles.leading}>
              <View style={styles.iconBadge}>
                <Icon
                  name={action.icon ?? 'plus'}
                  size="sm"
                  color={theme.colors.onSecondaryContainer}
                />
              </View>
              <Text
                style={[theme.typography('labelMd'), styles.label]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {action.label}
              </Text>
            </View>
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
      justifyContent: 'space-between',
      gap: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum
    },
    // `flex: 1` directly on `label` stretched it across the row's entire
    // remaining width, leaving real empty space between the icon and its
    // own label once RTL row mirroring positioned the icon at one edge
    // and the label's (misaligned) content at the other. Grouping icon +
    // label in their own row with natural (`flexShrink`, not `flex`)
    // sizing keeps them adjacent regardless of which edge
    // `justifyContent: 'space-between'` sends this group to.
    leading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      flexShrink: 1,
      minWidth: 0
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
      flexShrink: 1,
      color: theme.colors.onSurface
    }
  })
}
