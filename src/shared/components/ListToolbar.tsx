import React from 'react'
import { Pressable, TextInput as RNTextInput, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { toPersianDigits } from '@shared/utils/persianText'
import { Icon } from './Icon'

export type ActiveFilterChip = {
  key: string
  label: string
  onRemove: () => void
}

type Props = {
  search: string
  onSearchChange: (text: string) => void
  searchPlaceholder: string
  /** How many filters are applied — the number on the filter button. */
  activeFilterCount: number
  onOpenFilters: () => void
  filterLabel: string
  chips: readonly ActiveFilterChip[]
}

/**
 * v1.3.0 (design batch 2, approved «فایل‌ها» mockup): one search pill
 * with a magnifier, the filter button with the applied-filter count, and
 * a row of the applied filters, each removable with ×.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  activeFilterCount,
  onOpenFilters,
  filterLabel,
  chips
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.search}>
          <Icon name="search" size="sm" color={theme.colors.onSurfaceVariant} />
          <RNTextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.colors.placeholder}
            accessibilityLabel="جستجو"
            style={[theme.typography('bodyMd'), styles.input]}
            returnKeyType="search"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="پاک کردن جستجو"
              onPress={() => onSearchChange('')}
              hitSlop={8}
            >
              <Icon name="close" size="xs" color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={filterLabel}
          onPress={onOpenFilters}
          style={styles.filterButton}
        >
          <Icon name="filter" size="sm" color={theme.colors.onSurface} />
          {activeFilterCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={[theme.typography('labelSm'), styles.countText]}>
                {toPersianDigits(String(activeFilterCount))}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`حذف فیلتر ${chip.label}`}
              onPress={chip.onRemove}
              style={styles.chip}
            >
              <Text style={[theme.typography('labelMd'), styles.chipText]}>{chip.label}</Text>
              <Icon name="close" size="xs" color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: { gap: theme.spacing.space3 },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      height: 52,
      paddingHorizontal: theme.spacing.space4,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    input: {
      flex: 1,
      color: theme.colors.onSurface,
      paddingVertical: 0,
      textAlign: theme.isRTL ? 'right' : 'left'
    },
    filterButton: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center'
    },
    countBadge: {
      position: 'absolute',
      top: -6,
      start: -6,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    countText: { color: theme.colors.onPrimary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.space2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainer
    },
    chipText: { color: theme.colors.onSurface }
  })
}
