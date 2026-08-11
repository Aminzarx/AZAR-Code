import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'

type Props = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

/** A single labeled checkbox — design-system's checkmark-in-box treatment, reusing the primary/outline pair every selected/unselected state already uses. */
export function Checkbox({ label, value, onChange, disabled }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => onChange(!value)}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={[styles.box, value && styles.boxChecked]}>
        {value ? <Icon name="check" size="xs" color={theme.colors.onPrimary} /> : null}
      </View>
      <Text style={[theme.typography('bodyMd'), styles.label]}>{label}</Text>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum
    },
    rowDisabled: {
      opacity: 0.5
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: theme.radius.small,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center'
    },
    boxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    label: {
      color: theme.colors.onSurface
    }
  })
}
