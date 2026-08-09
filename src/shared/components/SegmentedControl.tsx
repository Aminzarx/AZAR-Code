import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../theme'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * design-system.md §7.4 — surface-container-low track, primary-container
 * fill on the active segment, rounded track with rounded inner segments.
 * Preferred over true Tabs for mutually-exclusive choices.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: Props<T>): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <Text
              style={[
                theme.typography('labelMd'),
                isSelected ? styles.labelSelected : styles.labelDefault
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: theme.radius.large,
      padding: theme.spacing.space1,
      gap: theme.spacing.space1
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.medium,
      paddingVertical: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum
    },
    segmentSelected: {
      backgroundColor: theme.colors.primaryContainer
    },
    labelDefault: {
      color: theme.colors.onSurfaceVariant
    },
    labelSelected: {
      color: theme.colors.onPrimaryContainer
    }
  })
}
