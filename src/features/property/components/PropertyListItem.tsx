import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EntityIconBadge, Icon, StatusBadge } from '@shared/components'
import { basePropertyStatus } from '../statusDerivation'
import type { Property } from '../types'

type Props = {
  property: Property
  onPress: () => void
  /**
   * Count of applicants the matching engine considers suitable for this
   * property, computed once at screen level (design-system.md §7 —
   * avoiding an N+1 query per row) and passed down. `undefined` while not
   * yet computed; the row simply omits the indicator until it is.
   */
  matchCount?: number
}

function formatPrice(price: number | null): string | null {
  if (price === null) {
    return null
  }
  return `${price.toLocaleString('fa-IR')} تومان`
}

export function PropertyListItem({ property, onPress, matchCount }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const priceLabel = formatPrice(property.price)
  const status = basePropertyStatus(property.status)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={property.title} onPress={onPress}>
      <Card>
        <View style={styles.titleRow}>
          <EntityIconBadge icon="files" tone="secondary" />
          <View style={styles.identity}>
            <Text
              style={[theme.typography('titleSm'), styles.title]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {property.title}
            </Text>
            <Text
              style={[theme.typography('bodySm'), styles.subtitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {property.city} • {property.address}
            </Text>
          </View>
          <StatusBadge label={status.label} tone={status.tone} />
        </View>
        {priceLabel ? (
          <Text style={[theme.typography('labelMd'), styles.price]}>{priceLabel}</Text>
        ) : null}
        {property.area !== null || property.rooms !== null ? (
          <View style={styles.metaGrid}>
            {property.area !== null ? (
              <View style={styles.metaCell}>
                <Text style={[theme.typography('bodySm'), styles.metaLabel]}>متراژ</Text>
                <Text style={[theme.typography('labelMd'), styles.metaValue]}>
                  {property.area} متر
                </Text>
              </View>
            ) : null}
            {property.rooms !== null ? (
              <View style={styles.metaCell}>
                <Text style={[theme.typography('bodySm'), styles.metaLabel]}>تعداد اتاق</Text>
                <Text style={[theme.typography('labelMd'), styles.metaValue]}>
                  {property.rooms} اتاق
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {matchCount ? (
          <View style={styles.matchRow}>
            <Icon name="person" size="xs" color={theme.colors.onSurfaceVariant} />
            <Text style={[theme.typography('labelSm'), styles.matchLabel]}>
              {matchCount.toLocaleString('fa-IR')} متقاضی مناسب
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    identity: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container (here,
    // `identity`) doesn't reliably stretch to full width, so alignSelf
    // anchors the box to the correct edge; flexShrink is separately
    // needed so long titles/subtitles truncate instead of overflowing
    // the row now that a badge and StatusBadge also share it.
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    price: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    // design-system.md §7.3.1's fixed 2-column percentage grid, reused
    // here for secondary meta (area/rooms) — content-driven card height,
    // never a minWidth-threshold row.
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space3
    },
    metaCell: {
      flexBasis: theme.component.statCardGrid.columnBasisPercent,
      flexGrow: 0,
      gap: theme.spacing.space1
    },
    metaLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    metaValue: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    matchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      marginTop: theme.spacing.space3
    },
    matchLabel: {
      color: theme.colors.onSurfaceVariant
    }
  })
}
