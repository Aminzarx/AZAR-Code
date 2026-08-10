import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import type { Property } from '../types'

type Props = {
  property: Property
  onPress: () => void
}

function formatPrice(price: number | null): string | null {
  if (price === null) {
    return null
  }
  return `${price.toLocaleString('fa-IR')} تومان`
}

export function PropertyListItem({ property, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const priceLabel = formatPrice(property.price)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={property.title} onPress={onPress}>
      <Card>
        <Text style={[theme.typography('titleSm'), styles.title]}>{property.title}</Text>
        <Text style={[theme.typography('bodySm'), styles.subtitle]}>
          {property.city} • {property.address}
        </Text>
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
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    price: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
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
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    metaValue: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
