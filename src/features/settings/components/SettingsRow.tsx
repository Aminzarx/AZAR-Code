import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from '@shared/components'

type Props = {
  icon: IconName
  label: string
  value?: string
  badge?: string
  onPress?: () => void
  destructive?: boolean
  /** no divider under the last row */
  last?: boolean
}

/** v1.4.0 (approved «من» design): one row of the profile list — icon, label, value or chevron. */
export function SettingsRow({ icon, label, value, badge, onPress, destructive, last }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const color = destructive ? theme.colors.error : theme.colors.onSurface
  const body = (
    <>
      <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
        <Icon name={icon} size="sm" color={destructive ? theme.colors.error : theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[theme.typography('bodyLg'), { color }]}>{label}</Text>
        {value ? (
          <Text style={[theme.typography('labelSm'), styles.value]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {badge ? <Text style={[theme.typography('labelSm'), styles.badge]}>{badge}</Text> : null}
      {onPress && !destructive ? <Icon name="chevron" size="xs" color={theme.colors.outline} /> : null}
    </>
  )
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={[styles.row, !last && styles.divider]}>{body}</View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      minHeight: 60
    },
    divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant },
    pressed: { backgroundColor: theme.colors.surfaceContainerLow },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.medium,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryContainer
    },
    iconWrapDestructive: { backgroundColor: theme.colors.errorContainer },
    text: { flex: 1, gap: 2, alignItems: theme.isRTL ? 'flex-start' : 'flex-end' },
    value: { color: theme.colors.onSurfaceVariant },
    badge: { color: theme.colors.success }
  })
}
