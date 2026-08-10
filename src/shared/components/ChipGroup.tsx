import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type ChipOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  label: string
  options: readonly ChipOption<T>[]
  /** `null` means "no filter" (all values). Tapping the already-selected chip clears back to `null`. */
  value: T | null
  onChange: (value: T | null) => void
}

/**
 * design-system.md §7.4 — a wrapping row of single-select filter chips
 * (radius-full, labelSm), used inside `FilterSheet` for the categorical
 * filters (§12 of the brief). Distinct from `SegmentedControl`: a
 * segmented control is a fixed, always-visible exclusive-choice track
 * (2-3 options that must always fit one row); a chip group is for a
 * clearable filter with more options than comfortably fit one row at
 * 320px, so it wraps instead of forcing every label to shrink.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: Props<T>): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(isSelected ? null : option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text
                style={[
                  theme.typography('labelSm'),
                  isSelected ? styles.chipLabelSelected : styles.chipLabel
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing.space2
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    label: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    chip: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    chipSelected: {
      borderColor: theme.colors.primaryContainer,
      backgroundColor: theme.colors.primaryContainer
    },
    chipLabel: {
      color: theme.colors.onSurfaceVariant
    },
    chipLabelSelected: {
      color: theme.colors.onPrimaryContainer
    }
  })
}
