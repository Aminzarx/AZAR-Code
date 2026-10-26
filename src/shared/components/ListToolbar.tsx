import React from 'react'
import { Pressable, TextInput as RNTextInput, StyleSheet, Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useLicence } from '../licence/LicenceContext'
import { useTheme, type Theme } from '@shared/theme'
import { toPersianDigits } from '@shared/utils/persianText'
import { Icon } from './Icon'

export type ActiveFilterChip = {
  key: string
  label: string
  onRemove: () => void
}

/** Amin #5067: a one-tap filter under the search (e.g. the deal type); filled while it is on. */
export type QuickFilterChip = {
  key: string
  label: string
  selected: boolean
  onPress: () => void
}

type Props = {
  search: string
  onSearchChange: (text: string) => void
  searchPlaceholder: string
  /** How many filters are applied — the number on the filter button. */
  activeFilterCount: number
  onOpenFilters: () => void
  filterLabel: string
  /** the applied filters that are not already shown as a quick chip, each removable with × */
  chips: readonly ActiveFilterChip[]
  quickFilters?: readonly QuickFilterChip[]
  /** clears every filter at once («پاک کردن همه»), shown while any filter is on */
  onClearAll?: () => void
}

/**
 * v1.3.0 (design batch 2, approved «فایل‌ها» mockup): one search pill with a magnifier and the filter button.
 *
 * Amin #5067 (a more professional filter):
 * - a scrolling row of quick chips right under the search (the most used filter, one tap, filled while on), led by
 *   «همه فیلترها» which opens the full sheet;
 * - while any filter is on the filter button turns solid with the count, and a summary row says how many filters
 *   are on, lists the other applied ones (each with ×) and offers «پاک کردن همه».
 * The quick row is the gesture-handler ScrollView, so a sideways drag on it scrolls it and never changes the tab.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  activeFilterCount,
  onOpenFilters,
  filterLabel,
  chips,
  quickFilters,
  onClearAll
}: Props): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  // Amin #4906: search and filters are closed while the licence has ended; the plain list stays readable
  if (!useLicence().canEdit) {
    return null
  }
  const active = activeFilterCount > 0
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
          accessibilityState={{ selected: active }}
          onPress={onOpenFilters}
          style={[styles.filterButton, active && styles.filterButtonOn]}
        >
          <Icon name="filter" size="sm" color={active ? theme.colors.onPrimary : theme.colors.onSurface} />
          {active ? (
            <View style={styles.countBadge}>
              <Text style={[theme.typography('labelSm'), styles.countText]}>
                {toPersianDigits(String(activeFilterCount))}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {quickFilters && quickFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="همه فیلترها"
            onPress={onOpenFilters}
            style={[styles.quick, styles.quickAll]}
          >
            <Icon name="filter" size="xs" color={theme.colors.onSurface} />
            <Text style={[theme.typography('labelMd'), styles.quickText]}>همه فیلترها</Text>
          </Pressable>
          {quickFilters.map((quick) => (
            <Pressable
              key={quick.key}
              accessibilityRole="button"
              accessibilityLabel={quick.label}
              accessibilityState={{ selected: quick.selected }}
              onPress={quick.onPress}
              style={[styles.quick, quick.selected && styles.quickOn]}
            >
              {quick.selected ? <Icon name="check" size="xs" color={theme.colors.onPrimary} /> : null}
              <Text
                style={[
                  theme.typography('labelMd'),
                  quick.selected ? styles.quickTextOn : styles.quickText
                ]}
              >
                {quick.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {active ? (
        <View style={styles.summary}>
          <Text style={[theme.typography('labelMd'), styles.summaryText]}>
            {`${toPersianDigits(String(activeFilterCount))} فیلتر فعال`}
          </Text>
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
          {onClearAll ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="پاک کردن همه فیلترها"
              onPress={onClearAll}
              hitSlop={8}
              style={styles.clearAll}
            >
              <Text style={[theme.typography('labelMd'), styles.clearAllText]}>پاک کردن همه</Text>
            </Pressable>
          ) : null}
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
      textAlign: theme.isRTL ? 'right' : 'left' // rtl-allow: TextInput: Android does not swap, so right is physical right
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
    filterButtonOn: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary
    },
    countBadge: {
      position: 'absolute',
      top: -6,
      start: -6,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: theme.colors.background,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    countText: { color: theme.colors.onPrimary },
    quickRow: { gap: theme.spacing.space2, paddingVertical: 2 },
    quick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      minHeight: 36,
      paddingHorizontal: theme.spacing.space3,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    quickAll: { backgroundColor: theme.colors.surfaceContainer },
    quickOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
    quickText: { color: theme.colors.onSurface },
    quickTextOn: { color: theme.colors.onPrimary },
    summary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    summaryText: { color: theme.colors.onSurfaceVariant },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      minHeight: 32,
      paddingHorizontal: theme.spacing.space3,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    chipText: { color: theme.colors.onSurface },
    clearAll: { marginStart: 'auto', paddingVertical: theme.spacing.space1 },
    clearAllText: { color: theme.colors.error }
  })
}
