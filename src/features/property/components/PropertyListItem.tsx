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
          {property.city} — {property.address}
        </Text>
        <View style={styles.metaRow}>
          {priceLabel ? (
            <Text style={[theme.typography('labelMd'), styles.price]}>{priceLabel}</Text>
          ) : null}
          {property.area !== null ? (
            <Text style={[theme.typography('labelSm'), styles.meta]}>{property.area} متر</Text>
          ) : null}
          {property.rooms !== null ? (
            <Text style={[theme.typography('labelSm'), styles.meta]}>{property.rooms} اتاق</Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    title: {
      color: theme.colors.onSurface
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    metaRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space2
    },
    price: {
      color: theme.colors.primary
    },
    meta: {
      color: theme.colors.outline
    }
  })
}
