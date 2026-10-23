import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../theme'
import { rtlFontFamilyByWeight } from '@shared/theme/tokens'

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
    // v1.4.0 (Amin #4318: «زیاد تمایزی بین انتخاب شده و انتخاب نشده نیست»): primaryContainer (#EDF1F6) on the
    // #F1F5F9 track was almost invisible; the chosen segment is now the solid primary fill with white bold text
    segmentSelected: {
      backgroundColor: theme.colors.primary
    },
    labelDefault: {
      color: theme.colors.onSurfaceVariant
    },
    labelSelected: {
      color: theme.colors.onPrimary,
      // after theme.typography('labelMd') in the style array, so the bold face wins
      ...(theme.isRTL ? { fontFamily: rtlFontFamilyByWeight['600'] } : { fontWeight: '600' as const })
    }
  })
}
