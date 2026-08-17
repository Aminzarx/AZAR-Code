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

/**
 * The app's focus is search over a potentially long list, not admiring one
 * card at a time — key specs (price, transaction type, area, rooms) are
 * condensed into a single inline meta line instead of a labeled 2-column
 * grid, so a card takes noticeably less vertical space and more of them
 * fit on screen at once.
 */
export function PropertyListItem({ property, onPress, matchCount }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const priceLabel = formatPrice(property.price)
  const status = basePropertyStatus(property.status)

  const metaParts = [
    property.transactionType,
    property.area !== null ? `${property.area} متر` : null,
    property.rooms !== null ? `${property.rooms} اتاق` : null
  ].filter((part): part is string => Boolean(part))

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
        <View style={styles.metaRow}>
          {priceLabel ? (
            <Text
              style={[theme.typography('labelMd'), styles.price]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {priceLabel}
            </Text>
          ) : null}
          {metaParts.length > 0 ? (
            <Text
              style={[theme.typography('bodySm'), styles.meta]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {metaParts.join(' • ')}
            </Text>
          ) : null}
          {matchCount ? (
            <View style={styles.matchBadge}>
              <Icon name="person" size="xs" color={theme.colors.onSurfaceVariant} />
              <Text style={[theme.typography('labelSm'), styles.matchLabel]}>
                {matchCount.toLocaleString('fa-IR')}
              </Text>
            </View>
          ) : null}
        </View>
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
    // One condensed row for everything that used to be 2-3 separate rows
    // (price, area/rooms grid, match count) — the app's focus is search
    // over a long list, so a shorter card that fits more rows on screen
    // matters more than a spacious, itemized layout here.
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      marginTop: theme.spacing.space2
    },
    price: {
      color: theme.colors.primary,
      flexShrink: 0
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1
    },
    matchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      marginStart: 'auto'
    },
    matchLabel: {
      color: theme.colors.onSurfaceVariant
    }
  })
}
